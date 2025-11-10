# Job Posting Limit Test Guide

## Test Scenarios

### Prerequisites
- Employer ID: `690d967d6a37aefc314b18c7`
- Current `totaljobpostinglimit`: `1`
- Base URL: Your API base URL (e.g., `http://localhost:4000`)

---

## Test 1: Post Job - Check Active Limit

### Step 1: Check Current Active Jobs
```bash
GET /employer/fetchjob/690d967d6a37aefc314b18c7
```
**Expected**: Returns list of jobs. Count how many have `isActive: true`

### Step 2: Post First Job (if 0 active jobs)
```bash
POST /employer/postjob
Content-Type: application/json

{
  "employid": "690d967d6a37aefc314b18c7",
  "jobTitle": "Test Developer",
  "companyName": "ram tech",
  "description": "Test job description",
  "category": "IT",
  "jobType": "Full-time",
  "contactEmail": "test@gmail.com",
  "isActive": true
}
```
**Expected Result**: 
- ✅ **SUCCESS** (201) - Job created if active jobs < 1
- ❌ **BLOCKED** (403) - If already 1 active job exists

### Step 3: Try Posting Second Job
```bash
POST /employer/postjob
Content-Type: application/json

{
  "employid": "690d967d6a37aefc314b18c7",
  "jobTitle": "Senior Developer",  // Different title
  "companyName": "ram tech",
  "description": "Another test job",
  "category": "IT",
  "jobType": "Full-time",
  "contactEmail": "test@gmail.com",
  "isActive": true
}
```
**Expected Result**: 
- ❌ **BLOCKED** (403) with message: `"You have reached your active job limit (1). Please close an existing job before posting a new one."`

---

## Test 2: Activate Job - Check Active Limit

### Step 1: Create a Job with isActive: false
```bash
POST /employer/postjob
Content-Type: application/json

{
  "employid": "690d967d6a37aefc314b18c7",
  "jobTitle": "Inactive Job",
  "companyName": "ram tech",
  "description": "This job starts inactive",
  "category": "IT",
  "jobType": "Full-time",
  "contactEmail": "test@gmail.com",
  "isActive": false  // Start as inactive
}
```
**Expected**: ✅ Job created successfully

### Step 2: Get the Job ID
Note the `_id` from the response (e.g., `690df0f16a37aefc314b1a0b`)

### Step 3: Try to Activate Job (when 1 job already active)
```bash
PUT /employer/updatejobstatus/690df0f16a37aefc314b1a0b
Content-Type: application/json

{
  "isActive": true
}
```
**Expected Result**:
- ✅ **SUCCESS** (200) - If current active jobs < 1
- ❌ **BLOCKED** (403) - If already 1 active job: `"Cannot activate job. You have reached your active job limit (1). Please deactivate another job first."`

---

## Test 3: Duplicate Job Title Check

### Step 1: Post Job with Title "Flutter Developer"
```bash
POST /employer/postjob
Content-Type: application/json

{
  "employid": "690d967d6a37aefc314b18c7",
  "jobTitle": "Flutter Developer",
  "companyName": "ram tech",
  "description": "First flutter job",
  "category": "IT",
  "contactEmail": "test@gmail.com",
  "isActive": true
}
```
**Expected**: ✅ Job created

### Step 2: Try Posting Same Title (Case Variations)
```bash
POST /employer/postjob
Content-Type: application/json

{
  "employid": "690d967d6a37aefc314b18c7",
  "jobTitle": "flutter developer",  // lowercase
  ...
}
```
**Expected Result**: 
- ❌ **BLOCKED** (400) - `"A job with this title already exists. Please use a different job title."`

Try also:
- `"FLUTTER DEVELOPER"` (uppercase)
- `"FlUtTeR dEvElOpEr"` (mixed case)

All should be blocked.

---

## Test 4: Deactivate Job (Always Allowed)

### Step 1: Deactivate an Active Job
```bash
PUT /employer/updatejobstatus/{jobId}
Content-Type: application/json

{
  "isActive": false
}
```
**Expected**: ✅ **SUCCESS** (200) - Deactivation is always allowed, no limit check

---

## Test 5: Post After Deactivating

### Step 1: Deactivate one active job
### Step 2: Try posting a new job
**Expected**: ✅ **SUCCESS** - Should work now since active count < limit

---

## Expected Error Messages

1. **Limit Reached (Post)**: 
   ```json
   {
     "success": false,
     "message": "You have reached your active job limit (1). Please close an existing job before posting a new one."
   }
   ```

2. **Limit Reached (Activate)**:
   ```json
   {
     "message": "Cannot activate job. You have reached your active job limit (1). Please deactivate another job first."
   }
   ```

3. **Duplicate Title**:
   ```json
   {
     "success": false,
     "message": "A job with this title already exists. Please use a different job title."
   }
   ```

4. **No Subscription**:
   ```json
   {
     "success": false,
     "message": "No active subscription. Please subscribe to post jobs."
   }
   ```

---

## Quick Test Checklist

- [ ] Post first job (should succeed)
- [ ] Post second job (should be blocked)
- [ ] Activate inactive job when limit reached (should be blocked)
- [ ] Deactivate job (should always succeed)
- [ ] Post after deactivating (should succeed)
- [ ] Try duplicate job title (should be blocked, case-insensitive)
- [ ] Verify error messages are clear

---

## Using Postman/Thunder Client

1. Create a collection with these requests
2. Set base URL variable
3. Set employerId variable: `690d967d6a37aefc314b18c7`
4. Run tests in sequence

---

## Using cURL

```bash
# Test 1: Post job
curl -X POST http://localhost:3000/employer/postjob \
  -H "Content-Type: application/json" \
  -d '{
    "employid": "690d967d6a37aefc314b18c7",
    "jobTitle": "Test Job",
    "companyName": "ram tech",
    "description": "Test",
    "category": "IT",
    "contactEmail": "test@gmail.com",
    "isActive": true
  }'

# Test 2: Activate job
curl -X PUT http://localhost:3000/employer/updatejobstatus/{jobId} \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}'
```

