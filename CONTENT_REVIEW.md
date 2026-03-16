# Content Review: Clarity & Accessibility Analysis

## Executive Summary
The website content is too abstract and philosophical for laypeople. It doesn't immediately communicate that StaatWright is a **digital solutions and consultancy firm**. The messaging needs to be more concrete and accessible.

---

## Critical Issues

### 1. **Missing Core Identity Statement**
**Problem:** Nowhere on the site does it clearly state: "We are a digital solutions and consultancy firm."

**Impact:** Visitors don't immediately understand what you do or what industry you're in.

**Where it's missing:**
- Home page hero section
- Header/navigation (no tagline)
- About page opening

---

### 2. **Too Abstract - Not Concrete Enough**

#### Home Page Hero
**Current:** "We start right - managing complexity, designing simplicity."
**Issue:** This is poetic but doesn't tell someone what you actually do.

**Better approach:** Lead with what you are, then add the philosophy:
- "We're a digital solutions and consultancy firm. We help businesses turn complex ideas into simple, working products."

#### About Page
**Current:** "Feels strikingly effortless."
**Issue:** This is an emotion, not information.

**Better approach:** Start with facts:
- "We're a digital solutions and consultancy firm that helps businesses build products, solve problems, and grow."

---

### 3. **Jargon Without Explanation**

**Terms used without context:**
- "MVP" (Minimum Viable Product) - not explained
- "CRUD" - technical term laypeople won't know
- "Low-fidelity UX flow" - industry jargon
- "Prototype" - used but not clearly defined in context
- "Component breakdown" - technical language

**Impact:** Non-technical visitors feel excluded or confused.

**Solution:** Either explain terms or use plain language:
- Instead of "MVP" → "working version of your product"
- Instead of "CRUD" → "basic create, read, update, delete functions"
- Instead of "low-fidelity UX flow" → "rough sketches of how users will move through your product"

---

### 4. **Unclear Consultancy Dynamic**

**Problem:** It's not immediately clear that:
- You work WITH clients (not just build your own products)
- You help businesses solve THEIR problems
- You provide expertise and guidance (consultancy)

**Current messaging suggests:** You build products (your ventures), but doesn't explain you also help others build theirs.

**What's missing:**
- Clear statement: "We help businesses build digital products"
- Explanation of the client relationship
- Examples of how you work with clients (not just your own ventures)

---

### 5. **Services Not Framed as Consultancy**

**Current framing:** "Services that feel simple"
**Issue:** Sounds like a product catalog, not consultancy services.

**Better framing:** 
- "Consultancy Services"
- "How We Help Businesses"
- "Our Approach to Digital Solutions"

---

## Page-by-Page Analysis

### **Home Page** (`app/page.tsx`)

**Issues:**
1. Hero headline is abstract: "We start right - managing complexity, designing simplicity"
2. Subheading mentions "build and launch products" but doesn't say you're a consultancy
3. No clear statement: "We are a digital solutions and consultancy firm"
4. Services preview doesn't explain these are consultancy services

**Recommendations:**
- Add tagline: "Digital Solutions & Consultancy Firm"
- Rewrite hero: "We help businesses turn complex ideas into simple, working digital products"
- Add context: "As a consultancy, we work with you to..."

---

### **About Page** (`app/about/page.tsx`)

**Issues:**
1. Headline "Feels strikingly effortless" is abstract
2. Vision is philosophical, not descriptive
3. No "What We Do" section explaining consultancy
4. Philosophy section is too abstract for first-time visitors

**Recommendations:**
- Add clear "What We Do" section at top
- Explain: "We're a digital solutions and consultancy firm that..."
- Move philosophy lower (after facts)
- Use concrete language before abstract concepts

---

### **Services Page** (`app/services/page.tsx`)

**Issues:**
1. Headline "Services that feel simple" is abstract
2. Jargon: "CRUD," "MVP," "low-fidelity UX flow"
3. "Complexity Tiers" section uses technical language
4. Doesn't frame services as consultancy offerings

**Recommendations:**
- Add explanation: "Our consultancy services include..."
- Define or replace jargon
- Add context: "When you work with us, we..."
- Explain complexity tiers in plain language

---

### **How We Work** (`app/how-we-work/page.tsx`)

**Issues:**
1. Headline "We make the complex feel strikingly simple" is abstract
2. Process is clear but lacks consultancy context
3. Doesn't explain the client relationship upfront

**Recommendations:**
- Add opening: "Here's how we work with clients..."
- Frame steps as consultancy process
- Add context about the client-consultant relationship

---

### **Philosophy Page** (`app/philosophy/page.tsx`)

**Issues:**
1. Entire page is abstract/philosophical
2. No concrete information about what you do
3. Assumes visitors already understand your business

**Recommendations:**
- Add brief intro explaining what you do
- Connect philosophy to concrete services
- Make it clear this is HOW you work, not WHAT you do

---

### **Ventures Page** (`app/ventures/page.tsx`)

**Issues:**
1. Shows products but doesn't explain consultancy relationship
2. Unclear if these are client projects or your own products
3. Doesn't connect to "we help you build products too"

**Recommendations:**
- Add context: "These are products we've built. We can help you build yours too."
- Clarify relationship to consultancy services
- Add CTA connecting ventures to client services

---

### **Header/Footer** (`components/Header.tsx`, `components/Footer.tsx`)

**Issues:**
1. No tagline or description
2. Just navigation, no context about what you do

**Recommendations:**
- Add tagline to header: "Digital Solutions & Consultancy"
- Add brief description to footer

---

## Recommended Content Changes

### Priority 1: Add Core Identity Statement

**Add to Home Page Hero:**
```
"We're a digital solutions and consultancy firm. 
We help businesses turn complex ideas into simple, working products."
```

**Add to Header (as tagline):**
```
"Digital Solutions & Consultancy"
```

**Add to About Page (top section):**
```
"What We Do
We're a digital solutions and consultancy firm that helps businesses 
build products, solve problems, and grow. We combine strategic thinking 
with technical expertise to turn your ideas into reality."
```

---

### Priority 2: Replace Abstract Headlines

**Home Page:**
- Current: "We start right - managing complexity, designing simplicity"
- New: "We help businesses build digital products that work"

**About Page:**
- Current: "Feels strikingly effortless"
- New: "We're a digital solutions and consultancy firm"

**Services Page:**
- Current: "Services that feel simple"
- New: "Our Consultancy Services"

**How We Work:**
- Current: "We make the complex feel strikingly simple"
- New: "How We Work With Clients"

---

### Priority 3: Explain or Replace Jargon

**Create a glossary or replace terms:**

| Current Term | Plain Language Alternative |
|-------------|---------------------------|
| MVP | Working version of your product |
| CRUD | Basic data management (create, read, update, delete) |
| Low-fidelity UX flow | Rough sketches of user journeys |
| Prototype | Early version to test ideas |
| Component breakdown | List of features and parts |
| Complexity tiers | Project difficulty levels |

---

### Priority 4: Add Consultancy Context

**Add to Services Page intro:**
```
"As a consultancy, we work with businesses to understand their needs, 
design solutions, and build products. Here's how we help:"
```

**Add to How We Work intro:**
```
"When you work with us, here's the process we follow to turn your 
idea into a working product:"
```

---

## Content Hierarchy Recommendation

**For laypeople, content should flow:**

1. **WHO YOU ARE** (first thing they see)
   - "We're a digital solutions and consultancy firm"

2. **WHAT YOU DO** (immediately after)
   - "We help businesses build digital products"

3. **HOW YOU DO IT** (then explain)
   - "Through strategic workshops, planning, and development"

4. **WHY IT WORKS** (then philosophy)
   - "We believe in simplicity and clarity"

**Current site does it backwards** - philosophy first, facts later.

---

## Quick Wins

1. **Add tagline to header:** "Digital Solutions & Consultancy"
2. **Rewrite home page hero** to state what you are
3. **Add "What We Do" section** to About page
4. **Replace 3-5 abstract headlines** with concrete ones
5. **Add glossary tooltip** or plain language explanations for jargon

---

## Testing Questions for Laypeople

After changes, ask non-technical people:
1. "What does this company do?" (Should answer: digital solutions/consultancy)
2. "Can they help me build a product?" (Should be clear: yes)
3. "What's the first step?" (Should be clear: contact/workshop)
4. "Do I understand their services?" (Should be: yes, without confusion)

If they can't answer these, content needs more work.

