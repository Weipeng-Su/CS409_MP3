const express = require('express');
const User = require('../models/user.js');
const Task = require('../models/task.js');

module.exports = function(router) {

    // Home route
    router.get('/', (req, res) => {
        res.json({ message: 'API is running', data: {} });
    });

    // --------- Users Routes ---------
    const usersRoute = router.route('/users');

    // GET users
    usersRoute.get(async (req, res) => {
        try {
            let query = User.find();

            if (req.query.where) query = query.find(JSON.parse(req.query.where));
            if (req.query.sort) query = query.sort(JSON.parse(req.query.sort));
            if (req.query.select) query = query.select(JSON.parse(req.query.select));
            if (req.query.skip) query = query.skip(parseInt(req.query.skip));
            if (req.query.limit) query = query.limit(parseInt(req.query.limit));
            if (req.query.count === 'true') {
                const count = await query.countDocuments();
                return res.json({ message: 'OK', data: count });
            }

            const users = await query.exec();
            res.json({ message: 'OK', data: users });
        } catch (err) {
            res.status(400).json({ message: 'Bad request', data: err.message });
        }
    });

    // POST create user
    usersRoute.post(async (req, res) => {
        try {
            const { name, email } = req.body;
            if (!name || !email) return res.status(400).json({ message: 'Name and email required', data: {} });

            const existing = await User.findOne({ email });
            if (existing) return res.status(400).json({ message: 'Email already exists', data: {} });

            const user = new User({ name, email });
            await user.save();
            res.status(201).json({ message: 'User created', data: user });
        } catch (err) {
            res.status(500).json({ message: 'Server error', data: err.message });
        }
    });

    // Single user route
    const singleUserRoute = router.route('/users/:id');

    // GET user by id
    singleUserRoute.get(async (req, res) => {
        try {
            let query = User.findById(req.params.id);
            if (req.query.select) query = query.select(JSON.parse(req.query.select));

            const user = await query.exec();
            if (!user) return res.status(404).json({ message: 'User not found', data: {} });
            res.json({ message: 'OK', data: user });
        } catch (err) {
            res.status(400).json({ message: 'Bad request', data: err.message });
        }
    });

    // PUT update user
    singleUserRoute.put(async (req, res) => {
        try {
            const { name, email, pendingTasks } = req.body;
            if (!name || !email) return res.status(400).json({ message: 'Name and email required', data: {} });

            const user = await User.findById(req.params.id);
            if (!user) return res.status(404).json({ message: 'User not found', data: {} });

            // Update pendingTasks if provided
            if (pendingTasks) {
                // Update tasks to assign this user
                await Task.updateMany(
                    { _id: { $in: pendingTasks } },
                    { assignedUser: user._id, assignedUserName: name }
                );
                user.pendingTasks = pendingTasks;
            }

            user.name = name;
            user.email = email;
            await user.save();
            res.json({ message: 'User updated', data: user });
        } catch (err) {
            res.status(500).json({ message: 'Server error', data: err.message });
        }
    });

    // DELETE user
    singleUserRoute.delete(async (req, res) => {
        try {
            const user = await User.findById(req.params.id);
            if (!user) return res.status(404).json({ message: 'User not found', data: {} });

            // Unassign tasks
            await Task.updateMany(
                { assignedUser: user._id },
                { assignedUser: null, assignedUserName: 'unassigned' }
            );

            await user.remove();
            res.status(204).json({ message: 'User deleted', data: {} });
        } catch (err) {
            res.status(500).json({ message: 'Server error', data: err.message });
        }
    });

    // --------- Tasks Routes ---------
    const tasksRoute = router.route('/tasks');

    // GET tasks
    tasksRoute.get(async (req, res) => {
        try {
            let query = Task.find();

            if (req.query.where) query = query.find(JSON.parse(req.query.where));
            if (req.query.sort) query = query.sort(JSON.parse(req.query.sort));
            if (req.query.select) query = query.select(JSON.parse(req.query.select));
            if (req.query.skip) query = query.skip(parseInt(req.query.skip));
            if (req.query.limit) query = query.limit(parseInt(req.query.limit));
            if (req.query.count === 'true') {
                const count = await query.countDocuments();
                return res.json({ message: 'OK', data: count });
            }

            const tasks = await query.exec();
            res.json({ message: 'OK', data: tasks });
        } catch (err) {
            res.status(400).json({ message: 'Bad request', data: err.message });
        }
    });

    // POST create task
    tasksRoute.post(async (req, res) => {
        try {
            const { name, description, deadline, completed, assignedUser } = req.body;
            if (!name || !deadline) return res.status(400).json({ message: 'Name and deadline required', data: {} });

            const task = new Task({ name, description, deadline, completed });

            if (assignedUser) {
                const user = await User.findById(assignedUser);
                if (user) {
                    task.assignedUser = user._id;
                    task.assignedUserName = user.name;
                    user.pendingTasks.push(task._id);
                    await user.save();
                }
            }

            await task.save();
            res.status(201).json({ message: 'Task created', data: task });
        } catch (err) {
            res.status(500).json({ message: 'Server error', data: err.message });
        }
    });

    // Single task route
    const singleTaskRoute = router.route('/tasks/:id');

    // GET task by id
    singleTaskRoute.get(async (req, res) => {
        try {
            let query = Task.findById(req.params.id);
            if (req.query.select) query = query.select(JSON.parse(req.query.select));

            const task = await query.exec();
            if (!task) return res.status(404).json({ message: 'Task not found', data: {} });
            res.json({ message: 'OK', data: task });
        } catch (err) {
            res.status(400).json({ message: 'Bad request', data: err.message });
        }
    });

    // PUT update task
    singleTaskRoute.put(async (req, res) => {
        try {
            const { name, description, deadline, completed, assignedUser } = req.body;
            if (!name || !deadline) return res.status(400).json({ message: 'Name and deadline required', data: {} });

            const task = await Task.findById(req.params.id);
            if (!task) return res.status(404).json({ message: 'Task not found', data: {} });

            // Remove task from old assignedUser pendingTasks
            if (task.assignedUser) {
                const oldUser = await User.findById(task.assignedUser);
                if (oldUser) {
                    oldUser.pendingTasks = oldUser.pendingTasks.filter(tid => tid.toString() !== task._id.toString());
                    await oldUser.save();
                }
            }

            task.name = name;
            task.description = description || '';
            task.deadline = deadline;
            task.completed = completed || false;

            if (assignedUser) {
                const user = await User.findById(assignedUser);
                if (user) {
                    task.assignedUser = user._id;
                    task.assignedUserName = user.name;
                    user.pendingTasks.push(task._id);
                    await user.save();
                } else {
                    task.assignedUser = null;
                    task.assignedUserName = 'unassigned';
                }
            } else {
                task.assignedUser = null;
                task.assignedUserName = 'unassigned';
            }

            await task.save();
            res.json({ message: 'Task updated', data: task });
        } catch (err) {
            res.status(500).json({ message: 'Server error', data: err.message });
        }
    });

    // DELETE task
    singleTaskRoute.delete(async (req, res) => {
        try {
            const task = await Task.findById(req.params.id);
            if (!task) return res.status(404).json({ message: 'Task not found', data: {} });

            // Remove task from assigned user's pendingTasks
            if (task.assignedUser) {
                const user = await User.findById(task.assignedUser);
                if (user) {
                    user.pendingTasks = user.pendingTasks.filter(tid => tid.toString() !== task._id.toString());
                    await user.save();
                }
            }

            await task.remove();
            res.status(204).json({ message: 'Task deleted', data: {} });
        } catch (err) {
            res.status(500).json({ message: 'Server error', data: err.message });
        }
    });

    return router;
};
