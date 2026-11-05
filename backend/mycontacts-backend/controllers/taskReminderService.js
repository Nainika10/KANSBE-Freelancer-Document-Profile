const cron = require('node-cron');
const cproject = require('../models/cprojectModel');
const User = require('../models/userModel');
const Cregister = require('../models/cregisterModel');
const { sendEmail } = require('../services/emailservice');

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// EMAIL TEMPLATES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const getClientApprovalEmailTemplate = (fullname, taskTitle) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 30px 20px; text-align: center; color: white; font-size: 24px; font-weight: 700; letter-spacing: 1px; }
    .content { padding: 40px 30px; line-height: 1.6; font-size: 15px; }
    .box { background: #f0f4f8; border-left: 5px solid #2a5298; border-radius: 6px; padding: 15px 20px; margin: 25px 0; }
    .highlight { font-weight: 600; color: #2a5298; }
    .footer { text-align: center; font-size: 12px; color: #888; padding: 20px; background: #f9f9f9; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">KANSBE</div>
    <div class="content">
      <p>Hi ${fullname || 'Client'},</p>
      <p>This is a gentle reminder that a new task has been drafted and is waiting for your review.</p>
      <div class="box">
        <p style="margin-top:0;"><strong>Task Title:</strong> <span class="highlight">"${taskTitle}"</span></p>
        <p style="margin-bottom:0;">Please log in to your dashboard to review the details. You can accept it to kick off the work, or request changes if something isn't quite right.</p>
      </div>
      <p>Thank you for keeping the project moving forward!</p>
      <p style="margin-top: 30px;">Best regards,<br/><strong>Team Kansbe</strong></p>
    </div>
    <div class="footer"><p>Â© ${new Date().getFullYear()} KANSBE Â· Freedom Â· Meaning Â· Possibility</p></div>
  </div>
</body>
</html>
`;

const getFreelancerReminderEmailTemplate = (fullname, taskTitle, status, dueDate) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 30px 20px; text-align: center; color: white; font-size: 24px; font-weight: 700; letter-spacing: 1px; }
    .content { padding: 40px 30px; line-height: 1.6; font-size: 15px; }
    .box { background: #fff5f5; border-left: 5px solid #ef2f2c; border-radius: 6px; padding: 15px 20px; margin: 25px 0; }
    .highlight { font-weight: 600; color: #ef2f2c; }
    .footer { text-align: center; font-size: 12px; color: #888; padding: 20px; background: #f9f9f9; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">KANSBE</div>
    <div class="content">
      <p>Hi ${fullname || 'Freelancer'},</p>
      <p>This is a friendly automated reminder regarding an upcoming task deadline.</p>
      <div class="box">
        <p style="margin-top:0;"><strong>Task Title:</strong> <span class="highlight">"${taskTitle}"</span></p>
        <p><strong>Current Status:</strong> ${status}</p>
        <p style="margin-bottom:0;"><strong>Due Date:</strong> ${new Date(dueDate).toLocaleString()}</p>
      </div>
      <p>Please make sure to update the task status in the portal and submit it for client approval as soon as you have finished the work.</p>
      <p style="margin-top: 30px;">Best regards,<br/><strong>Team Kansbe</strong></p>
    </div>
    <div class="footer"><p>Â© ${new Date().getFullYear()} KANSBE Â· Freedom Â· Meaning Â· Possibility</p></div>
  </div>
</body>
</html>
`;

const getClientCompletionEmailTemplate = (fullname, taskTitle, dueDate) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 30px 20px; text-align: center; color: white; font-size: 24px; font-weight: 700; letter-spacing: 1px; }
    .content { padding: 40px 30px; line-height: 1.6; font-size: 15px; }
    .box { background: #f0f4f8; border-left: 5px solid #2a5298; border-radius: 6px; padding: 15px 20px; margin: 25px 0; }
    .highlight { font-weight: 600; color: #2a5298; }
    .footer { text-align: center; font-size: 12px; color: #888; padding: 20px; background: #f9f9f9; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">KANSBE</div>
    <div class="content">
      <p>Hi ${fullname || 'Client'},</p>
      <p>Your freelancer has submitted their work and it is ready for your final review and approval.</p>
      <div class="box">
        <p style="margin-top:0;"><strong>Task Title:</strong> <span class="highlight">"${taskTitle}"</span></p>
        <p><strong>Task Due Date:</strong> ${new Date(dueDate).toLocaleString()}</p>
        <p style="margin-bottom:0;">Please log in to your dashboard to review the submission. You can approve it to mark the task complete, or request revisions if needed.</p>
      </div>
      <p>We appreciate your prompt feedback so we can wrap this up for you!</p>
      <p style="margin-top: 30px;">Warm regards,<br/><strong>Team Kansbe</strong></p>
    </div>
    <div class="footer"><p>Â© ${new Date().getFullYear()} KANSBE Â· Freedom Â· Meaning Â· Possibility</p></div>
  </div>
</body>
</html>
`;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// HELPER: Returns interval in minutes based on hours until due
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Scenario B1: Task NOT STARTED (pending)
 * - Standard (24+ hrs left): every 12 hrs
 * - Urgent   (<24 hrs left):  every 2 hrs
 * - Critical (<8 hrs left):   every 1 hr
 */
const getFreelancerPendingIntervalMins = (hoursUntilDue) => {
    if (hoursUntilDue < 8)  return 60;   // Critical: every 1 hr
    if (hoursUntilDue < 24) return 120;  // Urgent:   every 2 hrs
    return 720;                           // Standard: every 12 hrs
};

/**
 * Scenario B2: Task STARTED (in-progress / need-changes)
 * - Standard (12+ hrs left): first reminder at 12-hr mark
 * - Urgent   (<12 hrs left): every 3 hrs
 * - Critical (<3 hrs left):  every 1 hr
 */
const getFreelancerInProgressIntervalMins = (hoursUntilDue) => {
    if (hoursUntilDue < 3)  return 60;   // Critical: every 1 hr
    if (hoursUntilDue < 12) return 180;  // Urgent:   every 3 hrs
    return null;                          // Standard: only fire once at <=12hr mark
};

/**
 * Scenario C: Client Completion Approval
 * - Standard (3+ hrs left):  every 1 hr
 * - Urgent   (<3 hrs left):  every 30 mins
 * - Critical (<1 hr left):   every 15 mins
 */
const getClientCompletionIntervalMins = (hoursUntilDue) => {
    if (hoursUntilDue < 1) return 15;   // Critical: every 15 mins
    if (hoursUntilDue < 3) return 30;   // Urgent:   every 30 mins
    return 60;                           // Standard: every 1 hr
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MAIN CRON JOB
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const startTaskReminderCron = () => {
    // Ticks every minute
    cron.schedule('* * * * *', async () => {
        try {
            // Skip tick if DB is not connected yet
            if (require('mongoose').connection.readyState !== 1) return;

            const projects = await cproject.find({ status: { $nin: ['completed', 'rejected'] } });
            const now = new Date();

            for (const project of projects) {
                if (!project.Tasks || project.Tasks.length === 0) continue;

                let projectUpdated = false;

                for (const task of project.Tasks) {
                    // ── FIX 1: Skip tasks in terminal state — no reminders needed ──
                    const TERMINAL_TASK_STATUSES = ['completed', 'approved', 'rejected'];
                    if (TERMINAL_TASK_STATUSES.includes(task.status)) continue;

                    // Ensure reminders sub-doc exists
                    if (!task.reminders) {
                        task.reminders = {
                            creation_approval_count: 0,
                            completion_approval_count: 0,
                            freelancer_due_count: 0
                        };
                    }

                    const r = task.reminders;
                    const dueDateMs = task.duedate ? new Date(task.duedate) : null;
                    const hoursUntilDue = dueDateMs ? (dueDateMs - now) / (1000 * 60 * 60) : null;

                    // â”€â”€ SCENARIO A â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                    // Client needs to approve task creation
                    // Recipient: Client (project.c_id)
                    if (task.status === 'pending-client-approval' && project.c_id) {
                        const minsSinceCreation = (now - new Date(task.createdAt || now)) / (1000 * 60);
                        const minsSinceLast = r.last_creation_approval_sent
                            ? (now - new Date(r.last_creation_approval_sent)) / (1000 * 60)
                            : Infinity;

                        const isFirstReminder  = r.creation_approval_count === 0 && minsSinceCreation >= 5;
                        const isFollowUp       = r.creation_approval_count > 0 && minsSinceLast >= 10;

                        if (isFirstReminder || isFollowUp) {
                            const client = await Cregister.findOne({ c_id: project.c_id });
                            if (client) {
                                await sendEmail(
                                    client.email,
                                    'Reminder: Task Approval Needed',
                                    getClientApprovalEmailTemplate(client.fullname, task.title)
                                );
                                r.creation_approval_count += 1;
                                r.last_creation_approval_sent = now;
                                projectUpdated = true;
                                console.log(`[Reminder-A] Sent creation approval email to client ${client.email} for task "${task.title}"`);
                            }
                        }
                    }

                    // â”€â”€ SCENARIO B â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                    // Freelancer deadline reminders (pending / in-progress / need-changes)
                    // Recipient: Assigned Freelancer only (task.assignedto)
                    if (
                        ['pending', 'in-progress', 'need-changes'].includes(task.status) &&
                        task.duedate &&
                        task.assignedto
                    ) {
                        const minsSinceLast = r.last_freelancer_due_sent
                            ? (now - new Date(r.last_freelancer_due_sent)) / (1000 * 60)
                            : Infinity;

                        let requiredIntervalMins = null;

                        if (task.status === 'pending') {
                            // Scenario B1: Not Started
                            requiredIntervalMins = getFreelancerPendingIntervalMins(hoursUntilDue);
                        } else {
                            // Scenario B2: Started (in-progress / need-changes)
                            requiredIntervalMins = getFreelancerInProgressIntervalMins(hoursUntilDue);
                        }

                        // For B2 Standard, only fire once at the <=12hr mark
                        let shouldSend = false;
                        if (task.status !== 'pending' && requiredIntervalMins === null) {
                            // Standard tier for B2: fire exactly once when crossing the 12-hr mark
                            if (hoursUntilDue <= 12 && r.freelancer_due_count === 0) {
                                shouldSend = true;
                            }
                        } else if (requiredIntervalMins !== null) {
                            shouldSend = minsSinceLast >= requiredIntervalMins;
                        }

                        if (shouldSend) {
                            const freelancer = await User.findOne({ fl_id: task.assignedto });
                            if (freelancer) {
                                await sendEmail(
                                    freelancer.email,
                                    'Task Deadline Reminder',
                                    getFreelancerReminderEmailTemplate(freelancer.fullname, task.title, task.status, task.duedate)
                                );
                                r.freelancer_due_count += 1;
                                r.last_freelancer_due_sent = now;
                                projectUpdated = true;
                                console.log(`[Reminder-B] Sent deadline reminder to freelancer ${freelancer.email} for task "${task.title}" | ${hoursUntilDue.toFixed(1)}h left`);
                            }
                        }
                    }

                    // â”€â”€ SCENARIO C â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                    // Client needs to approve freelancer's submitted work
                    // Recipient: Client (project.c_id)
                    if (task.status === 'pending-client-completion-approval' && project.c_id && task.duedate) {
                        const minsSinceLast = r.last_completion_approval_sent
                            ? (now - new Date(r.last_completion_approval_sent)) / (1000 * 60)
                            : Infinity;

                        const requiredIntervalMins = getClientCompletionIntervalMins(hoursUntilDue);
                        const shouldSend = minsSinceLast >= requiredIntervalMins;

                        if (shouldSend) {
                            const client = await Cregister.findOne({ c_id: project.c_id });
                            if (client) {
                                await sendEmail(
                                    client.email,
                                    'Action Required: Freelancer Task Awaiting Your Approval',
                                    getClientCompletionEmailTemplate(client.fullname, task.title, task.duedate)
                                );
                                r.completion_approval_count += 1;
                                r.last_completion_approval_sent = now;
                                projectUpdated = true;
                                console.log(`[Reminder-C] Sent completion approval email to client ${client.email} for task "${task.title}" | ${hoursUntilDue.toFixed(1)}h left | interval: ${requiredIntervalMins}mins`);
                            }
                        }
                    }
                } // end task loop

                if (projectUpdated) {
                    await project.save();
                }
            } // end project loop

        } catch (err) {
            console.error('[TaskReminderCron] Error:', err.message);
        }
    });
};

module.exports = { startTaskReminderCron };
