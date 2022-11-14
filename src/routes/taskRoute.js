const express = require('express')
const router = express.Router()
const passport = require('passport')

const { PrismaClient } = require('@prisma/client')
const helper = require('../helper')
const prisma = new PrismaClient()

const getSingleTask = async (taskId) => {
  return await prisma.task.findUnique({
    where: {
      id: taskId
    },
    include: {
      task_user: {
        select: {
          user: {
            select: {
              firstname: true,
              color: true
            }
          }
        }
      }
    }
  })
}

const createTaskUserArray = (assignedUsers, taskId) => {
  const result = []
  assignedUsers.forEach(element => {
    result.push(
      {
        fk_user_id: element, fk_task_id: taskId
      }
    )
  })
  return result
}

const createManyTaskUser = async (assignedUser, taskId) => {
  const tasksUser = await prisma.task_user.createMany({
    data: createTaskUserArray(assignedUser, taskId)
  })
  console.log(tasksUser)
}

const createTask = async (req, res) => {
  if (!req.body.name || !req.body.date) {
    helper.resSend(res, null, helper.resStatuses.error, 'Empty Fields!')
    return
  }
  const task = await prisma.task.create({
    data: {
      name: req.body.name,
      notes: req.body.notes ?? '',
      date: new Date(req.body.date),
      fk_community_id: req.user.fk_community_id,
      fk_routine_id: req.body.fk_routine_id ?? undefined
    }
  })
  if (req.body.assignedUser) {
    await createManyTaskUser(req.body.assignedUser, task.id)
  }
  helper.resSend(res, await getSingleTask(task.id))
}

const updateTask = async (req, res, taskId) => {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      name: req.body.name ?? undefined,
      notes: req.body.notes ?? undefined,
      date: req.body.date ? new Date(req.body.date) : undefined,
      done: req.body.done ?? undefined
    },
    include: {
      task_user: {
        where: {
          fk_user_id: { in: req.body.assignedUser }
        }
      }
    }
  })
  if (req.body.assignedUser) {
    if (task.task_user.length === 0) {
      await createManyTaskUser(req.body.assignedUser, task.id)
    }
  }
  helper.resSend(res, await getSingleTask(taskId))
}

router.post('/create', passport.authenticate('userAuth', { session: false }), async (req, res) => {
  const taskId = req.body.id
  if (!taskId) {
    createTask(req, res)
  } else {
    updateTask(req, res, taskId)
  }
})

router.delete('/delete/:id', passport.authenticate('userAuth', { session: false }), async (req, res) => {
  if (!req.params.id || isNaN(req.params.id)) {
    helper.resSend(res, null, helper.resStatuses.error, 'Empty Fields!')
    return
  }
  await prisma.task_user.deleteMany({
    where: {
      fk_task_id: parseInt(req.params.id)
    }
  })
  await prisma.task.delete({
    where: {
      id: parseInt(req.params.id)
    }
  })
  helper.resSend(res, 'deleted Task ' + req.params.id)
})

router.post('/gettasksininterval', passport.authenticate('userAuth', { session: false }), async (req, res) => {
  if (!req.body.startDate || !req.body.endDate) {
    helper.resSend(res, null, helper.resStatuses.error, 'Empty Fields!')
    return
  }
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 1)
  const tasks = await prisma.task.findMany({
    where: {
      fk_community_id: req.user.fk_community_id,
      date: {
        gte: new Date(req.body.startDate),
        lte: new Date(req.body.endDate)
      }
    },
    include: {
      task_user: {
        select: {
          user: {
            select: {
              id: true,
              firstname: true,
              color: true
            }
          }
        }
      }
    },
    orderBy: [
      {
        date: 'asc'
      }
    ]
  })
  const routines = await prisma.routine.findMany({
    where: {
      fk_community_id: req.user.fk_community_id
    }
  })
  for (const routine in routines) {
    const date = routines[routine].startDate
    while (date <= new Date(req.body.endDate)) {
      if (date >= new Date(req.body.startDate)) {
        const task = await prisma.task.findFirst({
          where: {
            fk_routine_id: routines[routine].id,
            date
          }
        })
        if (!task) {
          tasks.push({ name: routines[routine].name, notes: task ? task.notes : '', date: date.toISOString(), done: task ? task.done : false, fk_community_id: req.user.fk_community_id, fk_routine_id: routines[routine].id })
        }
      }
      date.setDate(date.getDate() + routines[routine].interval)
    }
  }
  helper.resSend(res, tasks)
})

router.post('/routine/create', passport.authenticate('userAuth', { session: false }), async (req, res) => {
  if (!req.body.name || !req.body.startDate || !req.body.interval) {
    helper.resSend(res, null, helper.resStatuses.error, 'Empty Fields!')
    return
  }
  const routine = await prisma.routine.create({
    data: {
      name: req.body.name,
      startDate: new Date(req.body.startDate),
      interval: req.body.interval,
      fk_community_id: req.user.fk_community_id
    }
  })
  helper.resSend(res, routine)
})

module.exports = router
