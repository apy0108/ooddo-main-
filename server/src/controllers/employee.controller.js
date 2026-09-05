const svc = require('../services/employee.service')
const { success } = require('../utils/apiResponse')

const list = async (req, res) => {
  const result = await svc.getAllEmployees(req.query)
  return success(res, result.employees, 200, result.meta)
}

const getOne = async (req, res) => {
  const emp = await svc.getEmployeeById(req.params.id)
  return success(res, emp)
}

const create = async (req, res) => {
  const emp = await svc.createEmployee(req.body)
  return success(res, emp, 201)
}

const update = async (req, res) => {
  const emp = await svc.updateEmployee(req.params.id, req.body)
  return success(res, emp)
}

const archive = async (req, res) => {
  await svc.archiveEmployee(req.params.id)
  return success(res, { message: 'Employee archived successfully' })
}

const counts = async (req, res) => {
  const data = await svc.getEmployeeCounts(req.params.id)
  return success(res, data)
}

module.exports = { list, getOne, create, update, archive, counts }
