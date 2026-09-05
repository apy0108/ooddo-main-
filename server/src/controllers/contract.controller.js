const svc = require('../services/contracts.service')
const { success } = require('../utils/apiResponse')

const list = async (req, res) => {
  const contracts = await svc.getAll(req.query)
  return success(res, contracts)
}

const getOne = async (req, res) => {
  const contract = await svc.getById(req.params.id)
  return success(res, contract)
}

const create = async (req, res) => {
  const contract = await svc.create(req.body)
  return success(res, contract, 201)
}

const update = async (req, res) => {
  const contract = await svc.update(req.params.id, req.body)
  return success(res, contract)
}

const activate = async (req, res) => {
  const contract = await svc.activate(req.params.id)
  return success(res, contract)
}

const cancel = async (req, res) => {
  const contract = await svc.cancel(req.params.id)
  return success(res, contract)
}

module.exports = { list, getOne, create, update, activate, cancel }
