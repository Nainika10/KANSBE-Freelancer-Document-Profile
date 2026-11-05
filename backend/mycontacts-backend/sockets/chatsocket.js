const { saveMessageSocket, editMessageSocket } = require("../controllers/chatController");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("💬 Chat socket connected:", socket.id);

    socket.on("joinProject", (projectId) => {
      socket.join(projectId);
      console.log(`User joined project room: ${projectId}`);
    });

    socket.on("chatMessage", async (msg) => {
      const savedMsg = await saveMessageSocket(msg, io);
      io.to(msg.projectId).emit("chatMessage", savedMsg);
    });

    socket.on("editChatMessage", async (msg) => {
      const editedMsg = await editMessageSocket(msg);
      if (editedMsg && !editedMsg.error) {
        io.to(msg.projectId).emit("chatMessageEdited", editedMsg);
      } else if (editedMsg?.error) {
        // Emit error back to the originating socket
        socket.emit("chatEditError", { message: editedMsg.error });
      }
    });

    socket.on("disconnect", () => {
      console.log("💬 Chat user disconnected:", socket.id);
    });
  });
};
