# Functional Foods - Personalized Meal Planning Platform

A modern web application for creating personalized meal plans based on user preferences, dietary restrictions, and health goals.

## 🚀 Features

- **Personalized Meal Planning**: Create custom meal plans based on dietary preferences
- **Recipe Database**: Access hundreds of healthy recipes
- **User Preferences**: Set dietary restrictions, allergies, and health goals
- **Modern UI**: Built with Next.js, TypeScript, and Tailwind CSS
- **Responsive Design**: Works perfectly on desktop and mobile

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React, Heroicons
- **UI Components**: Headless UI
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Deployment**: Vercel
- **State Management**: React Context + Hooks
- **Image Processing**: Sharp.js
- **AI Integration**: OpenAI API

## ⚠️ Critical Development Constraints

### Vercel Deployment Limits
- **API Route Timeout**: 10 seconds maximum
- **Function Size**: 50MB maximum
- **Request/Response Size**: 4.5MB maximum
- **Environment Variables**: Must be set in Vercel dashboard

### Supabase Limits
- **Database**: PostgreSQL with connection pooling
- **Real-time**: WebSocket connections for live updates
- **Storage**: File uploads with size limits
- **Row Level Security**: Enabled by default

### Performance Requirements
- **Page Load**: < 3 seconds on 3G
- **Image Optimization**: Automatic via Next.js Image component
- **Bundle Size**: Keep under 250KB for main bundle

## 🏗️ Project Structure

```
src/
├── app/                 # Next.js app directory
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/          # Reusable components
├── lib/                # Utility functions
└── types/              # TypeScript type definitions
```

## 🚨 Development Guidelines

### Before Implementing Features
1. **Check Vercel limits** - Will this exceed 10s timeout?
2. **Verify Supabase schema** - Does the table structure support this?
3. **Consider bundle size** - Will this add significant weight?

### Testing Requirements
1. **Always test in browser** - Don't just review code
2. **Check Vercel logs** - Monitor for timeout errors
3. **Verify in production** - Test deployed version, not just local
4. **Console debugging** - Check browser console for errors

### Common Pitfalls to Avoid
- **API timeouts**: Long-running operations in API routes
- **Large file uploads**: Exceeding Vercel size limits
- **Missing environment variables**: Check Vercel dashboard
- **Database connection issues**: Verify Supabase connection strings

### ⚠️ CRITICAL: Vercel Timeout Rule
**ANY operation that might take longer than 10 seconds MUST use batch processing:**
- **Database operations** on 1000+ records
- **File processing** of large datasets
- **API calls** that could be slow
- **Data transformations** of large amounts of data

**Implementation Pattern:**
```typescript
// ❌ DON'T: Process all items sequentially
for (const item of allItems) {
  await processItem(item) // Will timeout on large datasets
}

// ✅ DO: Use batch processing
const batchSize = 100
for (let i = 0; i < allItems.length; i += batchSize) {
  const batch = allItems.slice(i, i + batchSize)
  await Promise.all(batch.map(item => processItem(item)))
}
```

### Debugging Checklist
- [ ] Browser console errors
- [ ] Vercel deployment logs
- [ ] Network tab responses
- [ ] Database query results
- [ ] Environment variable values

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/nicolaivarney2/functionalfoods.git
cd functionalfoods
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Fill in your Supabase and OpenAI keys
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 Development Goals

- [ ] Replicate functionalfoods.dk design and functionality
- [ ] Implement personalized meal planning algorithm
- [ ] Create user preference management system
- [ ] Build recipe recommendation engine
- [ ] Add meal plan sharing and export features

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature-name`
2. Make your changes
3. **Test thoroughly** - Check browser, console, and Vercel logs
4. Commit your changes: `git commit -m 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Create a pull request

## 📄 License

This project is licensed under the MIT License.
