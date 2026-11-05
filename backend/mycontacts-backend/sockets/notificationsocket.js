global.onlineUsers = {};
global.adminUsers = {};

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("🔔 Socket connected:", socket.id);

    socket.on("registerUser", ({ userId, role }) => {

      // Store normal users
      global.onlineUsers[userId] = socket.id;

      // Store admins separately
      if (role === "Admin") {
        global.adminUsers[userId] = socket.id;
        console.log(`👑 Admin ${userId} registered`);
      }

      console.log(`✅ User ${userId} registered`);
    });

    socket.on("joinProject", (projectId) => {
      if (projectId) {
        socket.join(projectId);
        console.log(`🔔 Socket ${socket.id} joined project room: ${projectId}`);
      }
    });

    socket.on("disconnect", () => {
      for (let userId in global.onlineUsers) {
        if (global.onlineUsers[userId] === socket.id) {
          delete global.onlineUsers[userId];
        }
      }

      for (let adminId in global.adminUsers) {
        if (global.adminUsers[adminId] === socket.id) {
          delete global.adminUsers[adminId];
        }
      }

      console.log("🔕 Disconnected:", socket.id);
    });
  });
};