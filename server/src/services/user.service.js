const authService = require('./auth.service')

module.exports = {
  ...authService,
  updateRole: async (actorId, targetId, role, active) => {
    return authService.updateUser(targetId, { role, active }, actorId)
  },
}
