const express = require('express')
const router = express.Router()
const auth = require('../middleware/userAuth')
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

const createTaskUserArray = (assignedUsers, taskRoutineId, taskOrRoutineString) => {
  const result = []
  assignedUsers.forEach(element => {
    result.push(
      {
        fk_user_id: element, [taskOrRoutineString]: taskRoutineId
      }
    )
  })
  return result
}

const createManyTaskUser = async (assignedUser, taskId) => {
  await prisma.task_user.createMany({
    data: createTaskUserArray(assignedUser, taskId, 'fk_task_id')
  })
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
      done: req.body.done ?? false,
      fk_community_id: req.user.communityId,
      fk_routine_id: req.body.fk_routine_id ?? undefined
    }
  })
  if (req.body.assignedUser && req.body.assignedUser[0] !== null) {
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
          fk_task_id: taskId
        }
      }
    }
  })
  if (req.body.assignedUser) {
    if (task.task_user.length === 0 && req.body.assignedUser.length !== 0) {
      await createManyTaskUser(req.body.assignedUser, task.id)
    } else {
      await prisma.task_user.deleteMany({
        where: { fk_task_id: task.id }
      })
      await createManyTaskUser(req.body.assignedUser, task.id)
    }
  }
  helper.resSend(res, await getSingleTask(taskId))
}

router.post('/create', auth, async (req, res) => {
  // #swagger.tags = ['Task']
  /* #swagger.security = [{"Bearer": []}] */
  const taskId = req.body.id
  if (!taskId) {
    createTask(req, res)
  } else {
    updateTask(req, res, taskId)
  }
})

router.delete('/delete/:id', auth, async (req, res) => {
  // #swagger.tags = ['Task']
  /* #swagger.security = [{"Bearer": []}] */
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

router.post('/gettasksininterval', auth, async (req, res) => {
  // #swagger.tags = ['Task']
  /* #swagger.security = [{"Bearer": []}] */
  if (!req.body.startDate || !req.body.endDate) {
    helper.resSend(res, null, helper.resStatuses.error, 'Empty Fields!')
    return
  }
  const tasks = await prisma.task.findMany({
    where: {
      fk_community_id: req.user.communityId,
      date: {
        gte: new Date(req.body.startDate.split('T')[0]),
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
              color: true,
              profile_image: true
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
      fk_community_id: req.user.communityId,
      active: true
    },
    include: {
      routine_user: {
        select: {
          user: {
            select: {
              id: true,
              firstname: true,
              color: true,
              profile_image: true
            }
          }
        }
      }
    }
  })
  for (const routine in routines) {
    const date = routines[routine].startDate
    while (date <= new Date(req.body.endDate)) {
      if (date >= new Date(req.body.startDate.split('T')[0])) {
        const task = await prisma.task.findFirst({
          where: {
            fk_routine_id: routines[routine].id, date
          }
        })
        if (!task) {
          tasks.push({ name: routines[routine].name, notes: task ? task.notes : '', date: date.toISOString(), done: task ? task.done : false, fk_community_id: req.user.communityId, fk_routine_id: routines[routine].id, task_user: routines[routine].routine_user })
        }
      }
      date.setDate(date.getDate() + routines[routine].interval)
    }
  }
  helper.resSend(res, tasks)
})

const getSingleRoutine = async (routineId) => {
  return await prisma.routine.findUnique({
    where: {
      id: routineId
    },
    include: {
      routine_user: {
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

const createRoutine = async (req, res) => {
  if (!req.body.name || !req.body.startDate || !req.body.interval) {
    helper.resSend(res, null, helper.resStatuses.error, 'Empty Fields!')
    return
  }
  const routine = await prisma.routine.create({
    data: {
      name: req.body.name,
      startDate: new Date(req.body.startDate),
      interval: req.body.interval,
      fk_community_id: req.user.communityId
    }
  })
  if (req.body.assignedUser) {
    const assignedUser = req.body.assignedUser
    await prisma.routine_user.createMany({
      data: createTaskUserArray(assignedUser, routine.id, 'fk_routine_id')
    })
  }
  helper.resSend(res, await getSingleRoutine(routine.id))
}

const updateRoutine = async (req, res, routineId) => {
  if (req.body.name || req.body.startDate || req.body.interval || req.body.active !== undefined) {
    await prisma.routine.update({
      where: {
        id: routineId
      },
      data: {
        name: req.body.name ?? undefined,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        interval: req.body.interval ?? undefined,
        active: req.body.active ?? undefined,
        fk_community_id: req.user.communityId
      }
    })
  }
  if (req.body.assignedUser) {
    const assignedUsers = req.body.assignedUser
    await prisma.routine_user.deleteMany({
      where: {
        fk_routine_id: routineId
      }
    })
    await prisma.routine_user.createMany({
      data: createTaskUserArray(assignedUsers, routineId, 'fk_routine_id')
    })
  }
  helper.resSend(res, await getSingleRoutine(routineId))
}

router.post('/routine/modify', auth, async (req, res) => {
  // #swagger.tags = ['Task']
  /* #swagger.security = [{"Bearer": []}] */
  const routineId = req.body.id
  if (!routineId) {
    createRoutine(req, res)
  } else {
    updateRoutine(req, res, routineId)
  }
})

router.get('/routine/all', auth, async (req, res) => {
  // #swagger.tags = ['Task']
  /* #swagger.security = [{"Bearer": []}] */
  const routines = await prisma.routine.findMany({
    where: {
      fk_community_id: req.user.communityId
    },
    include: {
      routine_user: {
        select: {
          user: {
            select: {
              id: true,
              firstname: true,
              color: true,
              profile_image: true
            }
          }
        }
      }
    }
  })
  helper.resSend(res, routines)
})

module.exports = router
