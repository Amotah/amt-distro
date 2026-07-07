function getDashboardPathForRole(role) {
  if (role === 'label' || role === 'partner') {
    return '/label-dashboard';
  }

  if (role === 'admin' || role === 'superadmin') {
    return '/admin';
  }

  return '/dashboard';
}

module.exports = {
  getDashboardPathForRole,
};
