# StaatWright

A venture studio that builds digital products designed to make complex systems feel simple.

## Brand Philosophy

**"Feels simple."**

Everything StaatWright creates — no matter how complex behind the scenes — should feel effortless, intuitive, and clean to the user.

## Getting Started

Install dependencies:

```bash
npm install
```

### Environment Variables

A `.env.local` file has been created for you. You need to fill in your actual credentials.

**📖 Full setup instructions:** See [SETUP.md](./SETUP.md) for detailed step-by-step guide.

**Quick setup:**

1. **Set up Supabase (Database):**
   - Sign up at [supabase.com](https://supabase.com)
   - Create a project and get your URL and anon key
   - Run the SQL from `supabase-schema.sql` in Supabase SQL Editor

2. **Set up Resend (Email):**
   - Sign up at [resend.com](https://resend.com)
   - Create an API key and copy it

3. **Update `.env.local`** with your actual values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   RESEND_API_KEY=re_your_api_key_here
   CONTACT_EMAIL=your-email@example.com
   ```

**Note:** For production, add these environment variables to your hosting platform (Vercel, etc.)

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build for Production

```bash
npm run build
npm start
```

## Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Resend** - Email service for contact form
- **Supabase** - Database for storing contact submissions
- **Vercel** - Recommended hosting platform

## Design System

### Colors
- Navy: `#1F2A38` - Primary brand background
- Slate Blue: `#5C6E81` - Secondary accents
- Warm Cream: `#EAE4DC` - Background overlays
- Off-White: `#F3F2EE` - Page background
- Charcoal: `#1A1A1A` - Text/logo

### Typography
- Headings: Poppins (600-700 weight)
- Body: Montserrat (400-500 weight)

## Pages

- `/` - Home
- `/about` - About StaatWright
- `/ventures` - All ventures
- `/philosophy` - Design philosophy
- `/contact` - Contact form

## License

© StaatWright. All rights reserved.

