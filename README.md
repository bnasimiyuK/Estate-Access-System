# Athi Estate Access Management System

## Overview
This project implements an Estate Access Management System (frontend + backend + SQL Server database) for automated gate control and payment-linked access.

## Stack
- Frontend: HTML, CSS (Tailwind optional), Vanilla JS
- Backend: Node.js, Express
- Database: Microsoft SQL Server

## Quick start
1. Create the SQL Server DB:
   - Run `database/estate_access.sql` in SQL Server Management Studio.
2. Edit `backend/.env` with DB credentials and JWT secret.
3. Install backend deps:
   ```bash
   cd backend
   npm install
   npm run start
