"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FileNode } from "@/lib/types";
import {
  Folder,
  FolderOpen,
  File,
  ChevronRight,
  Upload,
  FolderPlus,
  Download,
  Trash2,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SelectedId = string | null; // null = root

// ─── Folder Tree (recursive) ──────────────────────────────────────────────────

interface FolderTreeItemProps {
  node: FileNode;
  allNodes: FileNode[];
  depth: number;
  selectedFolderId: SelectedId;
  onSelect: (id: string) => void;
}

function FolderTreeItem({
  node,
  allNodes,
  depth,
  selectedFolderId,
  onSelect,
}: FolderTreeItemProps) {
  const children = allNodes.filter(
    (n) => n.parent_id === node.id && n.type === "folder"
  );
  const isSelected = selectedFolderId === node.id;

  return (
    <div>
      <button
        onClick={() => onSelect(node.id)}
        className="w-full text-left flex items-center gap-2 px-4 py-1.5 transition-colors hover:bg-linen/60"
        style={{
          paddingLeft: `${16 + depth * 16}px`,
          background: isSelected ? "#EAE4DC" : undefined,
          color: isSelected ? "#1F2A38" : "#5C6E81",
          fontFamily: "var(--font-montserrat)",
          fontSize: 13,
          borderRadius: 0,
        }}
      >
        {isSelected ? (
          <FolderOpen size={14} className="shrink-0" />
        ) : (
          <Folder size={14} className="shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {children.map((child) => (
        <FolderTreeItem
          key={child.id}
          node={child}
          allNodes={allNodes}
          depth={depth + 1}
          selectedFolderId={selectedFolderId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

// ─── FileManager ──────────────────────────────────────────────────────────────

export default function FileManager() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [nodes, setNodes] = useState<FileNode[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<SelectedId>(null);
  const [loading, setLoading] = useState(true);
  const [showNewFolderForm, setShowNewFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);

  // ── Load all nodes ─────────────────────────────────────────────────────────

  const loadNodes = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("file_nodes")
      .select("*")
      .order("type")
      .order("name");
    setNodes((data as FileNode[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  // ── Derived: breadcrumb ────────────────────────────────────────────────────

  function buildBreadcrumb(folderId: SelectedId): FileNode[] {
    if (!folderId) return [];
    const path: FileNode[] = [];
    let current: FileNode | undefined = nodes.find((n) => n.id === folderId);
    while (current) {
      path.unshift(current);
      current = current.parent_id
        ? nodes.find((n) => n.id === current!.parent_id)
        : undefined;
    }
    return path;
  }

  const breadcrumb = buildBreadcrumb(selectedFolderId);

  // ── Derived: children of selected folder ───────────────────────────────────

  const children = nodes
    .filter((n) => n.parent_id === selectedFolderId)
    .sort((a, b) => {
      // folders first
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  // ── Root-level folders for tree panel ─────────────────────────────────────

  const rootFolders = nodes.filter(
    (n) => n.parent_id === null && n.type === "folder"
  );

  // ── Create folder ──────────────────────────────────────────────────────────

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    const { error } = await supabase.from("file_nodes").insert({
      name: newFolderName.trim(),
      type: "folder",
      parent_id: selectedFolderId,
    });
    if (error) {
      alert("Error creating folder: " + error.message);
    }
    setNewFolderName("");
    setShowNewFolderForm(false);
    setCreatingFolder(false);
    loadNodes();
  }

  // ── Upload files ───────────────────────────────────────────────────────────

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const folderPrefix = selectedFolderId ?? "root";

    for (const file of Array.from(files)) {
      const path = `${folderPrefix}/${file.name}`;
      const { error: storageError } = await supabase.storage
        .from("files")
        .upload(path, file, { upsert: true });

      if (storageError) {
        alert(`Error uploading ${file.name}: ${storageError.message}`);
        continue;
      }

      await supabase.from("file_nodes").insert({
        name: file.name,
        type: "file",
        parent_id: selectedFolderId,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
      });
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploading(false);
    loadNodes();
  }

  // ── Delete file ────────────────────────────────────────────────────────────

  async function handleDeleteFile(node: FileNode) {
    if (!window.confirm(`Delete "${node.name}"?`)) return;
    if (node.storage_path) {
      await supabase.storage.from("files").remove([node.storage_path]);
    }
    await supabase.from("file_nodes").delete().eq("id", node.id);
    setNodes((prev) => prev.filter((n) => n.id !== node.id));
  }

  // ── Delete folder ──────────────────────────────────────────────────────────

  async function handleDeleteFolder(node: FileNode) {
    const hasChildren = nodes.some((n) => n.parent_id === node.id);
    if (hasChildren) {
      alert("Cannot delete a folder that contains items. Remove all contents first.");
      return;
    }
    if (!window.confirm(`Delete folder "${node.name}"?`)) return;
    await supabase.from("file_nodes").delete().eq("id", node.id);
    // If we had this folder selected, go up to parent
    if (selectedFolderId === node.id) {
      setSelectedFolderId(node.parent_id);
    }
    setNodes((prev) => prev.filter((n) => n.id !== node.id));
  }

  // ── Download URL ───────────────────────────────────────────────────────────

  function getDownloadUrl(node: FileNode): string {
    if (!node.storage_path) return "#";
    return supabase.storage
      .from("files")
      .getPublicUrl(node.storage_path).data.publicUrl;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 56px)",
        marginTop: "56px",
      }}
    >
      {/* ── Left: Folder tree ── */}
      <div
        style={{
          width: 240,
          borderRight: "1px solid #EAE4DC",
          background: "#FAFAF9",
          overflowY: "auto",
          padding: "16px 0",
          flexShrink: 0,
        }}
      >
        <p
          className="px-4 mb-3 text-navy font-bold text-sm uppercase tracking-wider"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          Files
        </p>

        {/* Root item */}
        <button
          onClick={() => setSelectedFolderId(null)}
          className="w-full text-left flex items-center gap-2 px-4 py-1.5 transition-colors hover:bg-linen/60"
          style={{
            background: selectedFolderId === null ? "#EAE4DC" : undefined,
            color: selectedFolderId === null ? "#1F2A38" : "#5C6E81",
            fontFamily: "var(--font-montserrat)",
            fontSize: 13,
            borderRadius: 0,
          }}
        >
          {selectedFolderId === null ? (
            <FolderOpen size={14} className="shrink-0" />
          ) : (
            <Folder size={14} className="shrink-0" />
          )}
          <span>Root</span>
        </button>

        {/* Folder tree */}
        {rootFolders.map((folder) => (
          <FolderTreeItem
            key={folder.id}
            node={folder}
            allNodes={nodes}
            depth={1}
            selectedFolderId={selectedFolderId}
            onSelect={setSelectedFolderId}
          />
        ))}
      </div>

      {/* ── Right: Contents ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {/* Top bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Breadcrumb */}
          <div
            className="flex items-center gap-1 text-sm text-steel flex-1 min-w-0"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            <button
              onClick={() => setSelectedFolderId(null)}
              className="hover:text-navy transition-colors"
            >
              Root
            </button>
            {breadcrumb.map((crumb) => (
              <span key={crumb.id} className="flex items-center gap-1">
                <ChevronRight size={14} className="text-steel shrink-0" />
                <button
                  onClick={() => setSelectedFolderId(crumb.id)}
                  className="hover:text-navy transition-colors truncate max-w-[160px]"
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>

          {/* New Folder button */}
          <button
            onClick={() => setShowNewFolderForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-linen text-steel hover:bg-linen transition-colors"
            style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
          >
            <FolderPlus size={14} />
            New Folder
          </button>

          {/* Upload Files button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-white disabled:opacity-50 transition-colors"
            style={{
              background: "#1F2A38",
              fontFamily: "var(--font-montserrat)",
              borderRadius: 0,
            }}
          >
            <Upload size={14} />
            {uploading ? "Uploading…" : "Upload Files"}
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* New Folder inline form */}
        {showNewFolderForm && (
          <form
            onSubmit={handleCreateFolder}
            className="flex items-center gap-3 mb-4 p-4 bg-white border border-linen"
          >
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              autoFocus
              required
              className="border border-linen bg-white text-ink text-sm px-3 py-2 focus:outline-none focus:border-steel flex-1"
              style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
            />
            <button
              type="submit"
              disabled={creatingFolder}
              className="px-4 py-2 text-sm text-white disabled:opacity-50"
              style={{
                background: "#1F2A38",
                fontFamily: "var(--font-montserrat)",
                borderRadius: 0,
              }}
            >
              {creatingFolder ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewFolderForm(false);
                setNewFolderName("");
              }}
              className="px-4 py-2 text-sm border border-linen text-steel hover:bg-linen transition-colors"
              style={{ fontFamily: "var(--font-montserrat)", borderRadius: 0 }}
            >
              Cancel
            </button>
          </form>
        )}

        {/* Contents */}
        {loading ? (
          <div
            className="text-center py-12 text-steel text-sm"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            Loading…
          </div>
        ) : children.length === 0 ? (
          <div
            className="text-center py-16 text-steel text-sm"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            This folder is empty.
          </div>
        ) : (
          <div className="bg-white border border-linen divide-y divide-linen">
            {children.map((node) => (
              <div
                key={node.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-linen/20 transition-colors"
              >
                {/* Icon */}
                {node.type === "folder" ? (
                  <Folder size={16} className="text-steel shrink-0" />
                ) : (
                  <File size={16} className="text-steel shrink-0" />
                )}

                {/* Name */}
                <div className="flex-1 min-w-0">
                  {node.type === "folder" ? (
                    <button
                      onClick={() => setSelectedFolderId(node.id)}
                      className="text-sm text-ink hover:text-navy transition-colors flex items-center gap-1 font-medium"
                      style={{ fontFamily: "var(--font-montserrat)" }}
                    >
                      {node.name}
                      <ChevronRight size={14} className="text-steel" />
                    </button>
                  ) : (
                    <span
                      className="text-sm text-ink truncate block"
                      style={{ fontFamily: "var(--font-montserrat)" }}
                    >
                      {node.name}
                    </span>
                  )}
                </div>

                {/* Size (files only) */}
                {node.type === "file" && (
                  <span
                    className="text-xs text-steel whitespace-nowrap w-20 text-right"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                  >
                    {formatBytes(node.size_bytes)}
                  </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {node.type === "file" && (
                    <a
                      href={getDownloadUrl(node)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-steel hover:text-navy transition-colors"
                      style={{ fontFamily: "var(--font-montserrat)" }}
                      download={node.name}
                    >
                      <Download size={13} />
                      Download
                    </a>
                  )}
                  <button
                    onClick={() =>
                      node.type === "folder"
                        ? handleDeleteFolder(node)
                        : handleDeleteFile(node)
                    }
                    className="flex items-center gap-1 text-xs text-steel hover:text-red-600 transition-colors"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Item count */}
        {!loading && children.length > 0 && (
          <p
            className="text-xs text-steel mt-3 text-right"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            {children.filter((n) => n.type === "folder").length} folder
            {children.filter((n) => n.type === "folder").length !== 1
              ? "s"
              : ""}
            , {children.filter((n) => n.type === "file").length} file
            {children.filter((n) => n.type === "file").length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
