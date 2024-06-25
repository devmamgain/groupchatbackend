// routers/group.js
const express = require("express");
const groupmodel = require('../datamodels/groups');
const authMiddleware = require('../middleware/auth');
const messageModel = require('../datamodels/message');

module.exports = (io) => {
  const router = express.Router();

  router.post('/api/groups', authMiddleware, async (req, res) => {
    try {
      const { name } = req.body;
      const group = new groupmodel({ name, members: [req.user.id], creator: req.user.id });
      await group.save();
      io.emit('groupCreated', group);
      res.status(201).send(group);
    } catch (error) {
      res.status(500).send({ error: 'Group creation failed' });
    }
  });

  router.get('/api/getgroups', authMiddleware, async (req, res) => {
    try {
      const groups = await groupmodel.find({});
      res.send(groups);
    } catch (error) {
      res.status(500).send({ error: 'Fetching groups failed' });
    }
  });

  router.post('/api/groups/:groupId/join', authMiddleware, async (req, res) => {
    try {
      const group = await groupmodel.findById(req.params.groupId);
      if (!group) return res.status(404).send({ error: 'Group not found' });

      if (group.members.includes(req.user.id)) {
        return res.status(400).send({ error: 'You are already a member of this group' });
      }

      group.members.push(req.user.id);
      await group.save();
      io.emit('groupUpdated', group); 
      res.send(group);
    } catch (error) {
      res.status(500).send({ error: 'Joining group failed' });
    }
  });

  router.post('/api/groups/:groupId/leave', authMiddleware, async (req, res) => {
    try {
      const group = await groupmodel.findById(req.params.groupId);
      if (!group) return res.status(404).send({ error: 'Group not found' });

      if (!group.members.includes(req.user.id)) {
        return res.status(400).send({ error: 'You are not a member of this group' });
      }

      const updatedMembers = group.members.filter(member => member.toString() !== req.user.id.toString());
      group.members = updatedMembers;

      await group.save();
      io.emit('groupUpdated', group); 
      res.send(group);
    } catch (error) {
      res.status(500).send({ error: 'Leaving group failed' });
    }
  });

  router.get('/api/groups/:groupId/messages', authMiddleware, async (req, res) => {
    try {
      const messages = await messageModel.find({ groupId: req.params.groupId });
      res.send(messages);
    } catch (error) {
      res.status(500).send({ error: 'Fetching messages failed' });
    }
  });

  return router;
};
