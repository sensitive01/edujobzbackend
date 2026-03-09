const Employee = require('../../models/employeeschema');
const Employer = require('../../models/employerSchema');
const EmployerAdmin = require('../../models/employeradminSchema');
const Job = require('../../models/jobSchema');

exports.getDashboardStats = async (req, res) => {
    try {
        const totalCandidates = await Employee.countDocuments();
        const totalEmployers = await Employer.countDocuments();
        const totalEmployerAdmins = await EmployerAdmin.countDocuments();
        const totalJobs = await Job.countDocuments();

        // Aggregate job stats per employer
        const jobs = await Job.find();

        const employerStatsMap = {};

        // To get names, we need to fetch all employers and employer admins
        const employers = await Employer.find({}, 'firstName lastName institutionName schoolName');
        const employerAdmins = await EmployerAdmin.find({}, 'employeradminUsername');

        const nameMap = {};
        employers.forEach(emp => {
            nameMap[emp._id.toString()] = {
                name: emp.schoolName || emp.institutionName || `${emp.firstName} ${emp.lastName}`,
                type: 'Employer'
            };
        });
        employerAdmins.forEach(admin => {
            nameMap[admin._id.toString()] = {
                name: admin.employeradminUsername,
                type: 'Employer Admin'
            };
        });

        jobs.forEach(job => {
            const empId = job.employid;
            if (!employerStatsMap[empId]) {
                const info = nameMap[empId] || { name: 'Unknown (' + empId + ')', type: 'Unknown' };
                employerStatsMap[empId] = {
                    id: empId,
                    name: info.name,
                    type: info.type,
                    jobsPosted: 0,
                    applied: 0,
                    hired: 0,
                    shortlisted: 0,
                    rejected: 0,
                    interviewScheduled: 0
                };
            }

            const stats = employerStatsMap[empId];
            stats.jobsPosted += 1;
            stats.applied += job.applications ? job.applications.length : 0;

            if (job.applications) {
                job.applications.forEach(app => {
                    const status = app.employapplicantstatus || 'Pending';
                    if (status === 'Accepted' || status === 'Hired') stats.hired += 1;
                    else if (status === 'Shortlisted') stats.shortlisted += 1;
                    else if (status === 'Rejected') stats.rejected += 1;
                    else if (status === 'Interview Scheduled') stats.interviewScheduled += 1;
                });
            }
        });

        const toTitleCase = (str) => {
            return str.toLowerCase().split(' ').map(word => {
                return (word.charAt(0).toUpperCase() + word.slice(1));
            }).join(' ');
        };

        const employerStats = Object.values(employerStatsMap)
            .filter(emp => !emp.name.startsWith('Unknown'))
            .map(emp => ({
                ...emp,
                name: toTitleCase(emp.name),
                totalApplications: emp.applied,
                statuses: {
                    hired: emp.hired,
                    shortlisted: emp.shortlisted,
                    interviewScheduled: emp.interviewScheduled,
                    rejected: emp.rejected,
                    pending: emp.applied - (emp.hired + emp.shortlisted + emp.interviewScheduled + emp.rejected)
                }
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        res.status(200).json({
            success: true,
            data: {
                totalCandidates,
                totalEmployers,
                totalEmployerAdmins,
                totalJobs,
                totalApplications: employerStats.reduce((sum, emp) => sum + emp.totalApplications, 0),
                employerStats
            }
        });
    } catch (error) {
        console.error("Error in getDashboardStats:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};
