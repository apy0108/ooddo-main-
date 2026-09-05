const svc = require('../services/workingSchedule.service')
const { success } = require('../utils/apiResponse')

const list = async (req, res) => {
  const schedules = await svc.getAll(req.query)
  return success(res, schedules)
}

const getOne = async (req, res) => {
  const schedule = await svc.getById(req.params.id)
  return success(res, schedule)
}

const create = async (req, res) => {
  const schedule = await svc.create(req.body)
  return success(res, schedule, 201)
}

const update = async (req, res) => {
  const schedule = await svc.update(req.params.id, req.body)
  return success(res, schedule)
}

const remove = async (req, res) => {
  await svc.remove(req.params.id)
  return success(res, { message: 'Working schedule deleted successfully' })
}

module.exports = { list, getOne, create, update, remove }
