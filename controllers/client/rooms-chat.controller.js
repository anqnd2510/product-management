const User = require("../../models/user.model");
const RoomChat = require("../../models/room-chat.model");

// [GET] /rooms-chat/
module.exports.index = async (req, res) => {
    const userId = res.locals.user.id;
  
    const listRoomChat = await RoomChat.find({
      "users.user_id": userId,
      typeRoom: "group",
      deleted: false
    });  
    res.render("client/pages/rooms-chat/index", {
      pageTitle: "Danh sách phòng",
      listRoomChat: listRoomChat
    });
  }

// [GET] /rooms-chat/create
module.exports.create = async (req, res) => {
    const friendList = res.locals.user.friendList;
  
    for (const friend of friendList) {
      const infoFriend = await User.findOne({
        _id: friend.user_id
      }).select("fullName avatar");
  
      friend.infoFriend = infoFriend;
    }
  
    res.render("client/pages/rooms-chat/create", {
      pageTitle: "Tạo phòng",
      friendList: friendList
    });
  };
  
  // [POST] /rooms-chat/create
module.exports.createPost = async (req, res) => {
    const title = req.body.title;
    const usersId = req.body.usersId;
  
    // Đang bị lỗi không cho lập nhóm chat với chỉ 1 người
    // Cần fix lại

    // Ensure usersId is an array before using forEach
    if (!Array.isArray(usersId)) {
      // Handle the case where usersId is not an array (e.g., log an error)
      console.error("usersId is not an array:", usersId);
      // You might want to send an appropriate response to the client or redirect to an error page
      return res.status(400).send("Invalid input");
    }
  
    const dataChat = {
      title: title,
      typeRoom: "group",
      users: []
    };
  
    userId.forEach(userId => {
      dataChat.users.push({
        user_id: userId,
        role: "user"
      });
    });
  
    dataChat.users.push({
      user_id: res.locals.user.id,
      role: "superAdmin"
    });
  
    const room = new RoomChat(dataChat);
    await room.save();
  
    res.redirect(`/chat/${room.id}`);
  };