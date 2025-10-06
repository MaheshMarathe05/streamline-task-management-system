# 🔴 CRITICAL: Database Connection Error Fixed

## Problem Identified

Your dashboard shows **all zeros** because **MongoDB is not running**!

### Error Details:
```
MongooseServerSelectionError: connect ECONNREFUSED ::1:27017
```

This means the backend API is running, but it cannot connect to MongoDB database.

---

## ✅ Solution Steps

### Step 1: Start MongoDB

**Windows PowerShell:**
```powershell
# Start MongoDB service
net start MongoDB
```

**If MongoDB is not installed as a service:**
```powershell
# Navigate to MongoDB bin directory (adjust path as needed)
cd "C:\Program Files\MongoDB\Server\7.0\bin"

# Start MongoDB
mongod --dbpath "C:\data\db"
```

**Alternative - Using MongoDB Compass:**
- Open MongoDB Compass
- It will automatically start the local MongoDB instance

---

### Step 2: Verify MongoDB is Running

```powershell
# Check if MongoDB is running on port 27017
netstat -ano | findstr :27017
```

You should see output showing MongoDB listening on port 27017.

---

### Step 3: Check Database Has Data

```powershell
# From your project root
cd server
node scripts/checkProjects.js
node scripts/checkUsers.js
```

---

### Step 4: Add Sample Data (if database is empty)

```powershell
cd server
node scripts/addSampleDataClean.js
```

This will create:
- Sample projects
- Sample tasks
- Test users

---

### Step 5: Restart Your Backend Server

```powershell
# Kill the existing server (Ctrl+C in the terminal)
# Then restart
cd server
npm start
```

You should see:
```
✅ MongoDB Connected successfully
🚀 Server running on port 5000
```

---

### Step 6: Refresh Dashboard

1. Open browser console (F12)
2. Look for console logs:
   - `📊 Fetching dashboard stats...`
   - `✅ Dashboard stats response:` (should show actual data)
   - `📈 Fetching project stats...`
   - `✅ Project stats set successfully:` (should show actual data)

3. If you see errors, check:
   - MongoDB is running
   - Backend server is connected to MongoDB
   - User is logged in

---

## 🎯 Expected Dashboard After Fix

Once MongoDB is running and has data, you should see:

- **Active Projects**: Actual count (not 0)
- **Tasks In Progress**: Actual count (not 0)
- **Completion Rate**: Calculated percentage
- **Overdue Tasks**: Actual count
- **Project Status Chart**: Pie chart with data
- **Project Task Statistics**: Bar chart with project names
- **Task Trends**: Line chart with 7-day data
- **Recent Projects**: List of actual projects

---

## 🔍 Troubleshooting

### MongoDB Won't Start

**Option 1: Install MongoDB**
1. Download from https://www.mongodb.com/try/download/community
2. Install with default settings
3. Ensure "Install MongoDB as a Service" is checked

**Option 2: Use MongoDB Atlas (Cloud)**
1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string
4. Update `.env` file:
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/taskmanager?retryWrites=true&w=majority
```

### Still Showing Zeros After MongoDB is Running

1. **Check backend logs** for connection success
2. **Verify database has data**: Run check scripts
3. **Add sample data**: Run `node scripts/addSampleDataClean.js`
4. **Clear browser cache** and hard refresh (Ctrl+Shift+R)
5. **Check console** for API errors

### API Returns Empty Arrays

This means MongoDB is connected but database is empty:
```javascript
{
  activeProjectsCount: 0,
  recentProjects: [],
  projectTaskStats: []
}
```

**Fix**: Run the sample data script:
```powershell
cd server
node scripts/addSampleDataClean.js
```

---

## 📝 Summary

The issue is **NOT** in the dashboard code - the code is correct!

The issue is: **MongoDB database is not running**

### Quick Fix Commands:
```powershell
# 1. Start MongoDB
net start MongoDB

# 2. Verify connection
cd server
node scripts/checkProjects.js

# 3. Add data if needed
node scripts/addSampleDataClean.js

# 4. Restart backend
npm start

# 5. Refresh browser
```

After these steps, your dashboard will show real data! 🎉
