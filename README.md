# Shahi Dental Clinic - Patient Management System

A comprehensive dental clinic management system built with Next.js (Frontend) and PHP + MySQL (Backend).

## 🏗️ Architecture

```
┌─────────────────────┐
│   Next.js Frontend  │ (Port 3000)
│      (React UI)     │
└──────────┬──────────┘
           │ HTTP/REST
           │
┌──────────▼──────────┐
│   PHP Backend API   │ (Port 8000)
│   (Business Logic)  │
└──────────┬──────────┘
           │ PDO
           │
┌──────────▼──────────┐
│   MySQL Database    │
│   (Data Storage)    │
└─────────────────────┘
```

## 📋 Features

- **Patient Management**: Register and manage patient records
- **Prescription System**: Create and manage prescriptions with teeth charts
- **Clinical Images**: Client-side image storage (IndexedDB/localStorage)
- **Billing**: Generate and track bills with payment status
- **Inventory**: Manage medicines and medical inventory
- **Authentication**: Secure user authentication and session management

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PHP 7.4+
- MySQL 5.7+

### Installation

1. **Run the setup script** (Windows):
   ```bash
   setup.bat
   ```
   This will:
   - Create the MySQL database
   - Import the schema
   - Configure environment files

2. **Configure database credentials**:
   Edit `php-backend/.env` and set your MySQL password:
   ```env
   DB_PASSWORD=your_mysql_password
   ```

3. **Start both servers**:
   ```bash
   start-all.bat
   ```
   Or start them individually:
   ```bash
   # Terminal 1 - Backend
   start-backend.bat
   
   # Terminal 2 - Frontend  
   start-frontend.bat
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   
5. **Default credentials** (after creating first user):
   - You'll need to sign up first
   - Or use: staff@shahi.com / Staff@1234 (if migrated from Supabase)

## Getting Started

First, ensure the PHP backend is running (see Quick Start above), then run the Next.js development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📁 Project Structure

```
titanium/
├── app/                    # Next.js app directory
│   ├── admin/             # Admin pages (inventory, patients, prescriptions, etc.)
│   ├── api/               # Next.js API routes (for image uploads, etc.)
│   └── auth/              # Authentication pages
├── components/            # React components
├── services/              # API service layer
│   ├── adminuser.ts       # Auth services
│   ├── patients.ts        # Patient management
│   ├── prescription.ts    # Prescription services
│   ├── bills.ts          # Billing services
│   └── medicine.ts       # Medicine/inventory
├── php-backend/          # PHP Backend ⭐ NEW
│   ├── api/              # API endpoints
│   │   ├── auth.php      # Authentication
│   │   ├── patients.php  # Patient CRUD
│   │   ├── prescriptions.php
│   │   ├── bills.php
│   │   └── medicines.php
│   ├── config/           # Configuration
│   │   ├── database.php  # DB connection
│   │   ├── cors.php      # CORS headers
│   │   └── helpers.php   # Helper functions
│   └── database/         # Database files
│       └── schema.sql    # MySQL schema
├── lib/                  # Utilities
│   └── apiClient.ts      # HTTP client for PHP API
└── .env.local           # Frontend environment variables
```

## 🔧 Configuration

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Backend (php-backend/.env)
```env
DB_HOST=localhost
DB_NAME=shahidentalclinic_dbhttps://meet.google.com/zhh-brxz-hpu
DB_USER=root
DB_PASSWORD=your_password
```

## 📡 API Endpoints

See the [PHP Backend README](php-backend/README.md) for complete API documentation.

### Quick Reference
- **Auth**: `/api/auth.php?action={signup|signin|signout|current-user}`
- **Patients**: `/api/patients.php`
- **Prescriptions**: `/api/prescriptions.php` 
- **Bills**: `/api/bills.php`
- **Medicines**: `/api/medicines.php`

## 🗄️ Database Schema

- **users** - User authentication
- **patients** - Patient records  
- **prescriptions** - Prescription data with teeth chart (JSON)
- **bills** - Billing with items (JSON)
- **medicines** - Inventory management
- **reference_counter** - Auto-incrementing reference numbers

## 📚 Migration from Supabase

**IMPORTANT**: This project has been migrated from Supabase to PHP + MySQL.

See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for detailed migration instructions.

## 📚 Migration from Supabase

**IMPORTANT**: This project has been migrated from Supabase to PHP + MySQL.

See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for detailed migration instructions.

## 🚢 Deployment

### Backend (PHP)
- Use Apache/Nginx with PHP-FPM
- Enable HTTPS
- Update CORS settings in `php-backend/config/cors.php`
- Use environment variables for secrets

### Frontend (Next.js)
- Build: `npm run build`
- Deploy to Vercel, Netlify, or custom server
- Update `NEXT_PUBLIC_API_URL` to production API

### Database
- Use managed MySQL (AWS RDS, Google Cloud SQL)
- Enable SSL connections
- Regular backups

## Learn More

### About Next.js

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You📝 Development Scripts

- `setup.bat` - Initial setup (database, env files)
- `start-all.bat` - Start both frontend and backend
- `start-backend.bat` - Start PHP server only
- `start-frontend.bat` - Start Next.js only

##  can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Clinical Images Storage System

### Overview
The application uses a client-side image storage system that supports multiple storage methods:

1. **Primary Storage**: IndexedDB (for modern browsers)
2. **Fallback Storage**: localStorage (for compatibility)
3. **Database Storage**: Only prescription metadata stored in Supabase (images are NOT stored in database)

### Key Features
- **Client-side only**: Images are stored locally on the user's device
- **Cross-browser compatibility**: Works on devices that don't support IndexedDB
- **Automatic fallback**: Seamlessly switches to localStorage if IndexedDB fails
- **Error handling**: Comprehensive error handling with user-friendly messages
- **Storage management**: Automatic cleanup of old data when storage limits are reached
- **Debug tools**: Built-in debugging component for troubleshooting

### Important Notes
- **Images are NOT stored in the database** - they are stored locally on each device
- **Images are device-specific** - they won't sync between different devices
- **Images persist between sessions** - they are saved in browser storage
- **Storage limits apply** - browser storage has size limits (typically 5-10MB for localStorage, much more for IndexedDB)

### Recent Fixes
- **Removed database storage for images** to avoid schema issues
- Fixed image loading issues when editing prescriptions
- Added proper error handling for storage operations
- Implemented fallback storage mechanism for unsupported browsers
- Added image removal functionality
- Improved file validation (size and type checking)
- Enhanced cross-device compatibility

### Build Status
- ✅ **Production build successful** - All TypeScript and ESLint errors resolved
- ✅ **Image storage working** - No database schema dependencies 
- ✅ **Cross-browser compatibility** - Supports all modern browsers
- ✅ **Error handling robust** - Comprehensive fallback mechanisms

### Usage
Images are automatically saved when:
- A prescription is created or updated
- Images are uploaded through the clinical images interface
- The form is submitted successfully

### Troubleshooting
If you encounter image-related issues:
1. Check browser console for detailed error messages
2. Use the "Debug Images" button in the clinical images section
3. Verify that the browser supports either IndexedDB or localStorage
4. Check available storage space
5. Remember that images are device-specific and won't appear on other devices
