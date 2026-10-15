const { app } = require("@azure/functions");

app.http("project-health", {
  route: "project-health",
  methods: ["POST"],
  authLevel: "anonymous",

  handler: async (request) => {
    let body;

    try {
      body = await request.json();
    } catch {
      return {
        status: 400,
        jsonBody: { error: "Request must contain valid JSON." }
      };
    }

    const tasks = body?.tasks;

    if (!Array.isArray(tasks)) {
      return {
        status: 400,
        jsonBody: { error: "A tasks array is required." }
      };
    }

    const now = new Date();
    const completedStatuses = [
      "done",
      "completed",
      "complete"
    ];

    const completed = tasks.filter(task =>
      completedStatuses.includes(
        String(task.status || "").toLowerCase()
      )
    );

    const pending = tasks.filter(task =>
      !completedStatuses.includes(
        String(task.status || "").toLowerCase()
      )
    );

    const overdue = pending.filter(task => {
      const date = task.dueDate || task.due_date || task.deadline;
      if (!date) return false;

      const due = new Date(date);
      return !Number.isNaN(due.getTime()) && due < now;
    });

    const atRisk = pending.filter(task => {
      const date = task.dueDate || task.due_date || task.deadline;
      if (!date) return false;

      const due = new Date(date);
      const daysRemaining =
        (due.getTime() - now.getTime()) / 86400000;

      return !Number.isNaN(due.getTime()) &&
        daysRemaining >= 0 &&
        daysRemaining <= 3;
    });

    const total = tasks.length;
    const completionPercentage = total
      ? Math.round((completed.length / total) * 100)
      : 0;

    let health = "On Track";

    if (overdue.length > 0) {
      health = "Needs Attention";
    } else if (atRisk.length > 0) {
      health = "At Risk";
    }

    return {
      jsonBody: {
        totalTasks: total,
        completedTasks: completed.length,
        pendingTasks: pending.length,
        overdueTasks: overdue.length,
        atRiskTasks: atRisk.length,
        completionPercentage,
        health,
        summary: total === 0
          ? "Add tasks to generate a project health report."
          : `${completionPercentage}% complete. ` +
            `${overdue.length} overdue and ` +
            `${atRisk.length} due within three days.`
      }
    };
  }
});
