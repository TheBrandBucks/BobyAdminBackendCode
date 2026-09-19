export const checkPrivilege = (requiredPrivilege) => {
  return (req, res, next) => {
    const user = req.user;

    // If user or privileges not found in request (JWT may be missing or broken)
    if (!user || !Array.isArray(user.privileges)) {
      return res.status(401).json({ message: "Unauthorized or invalid privileges" });
    }

    // Check if the user has the required privilege
    if (!user.privileges.includes(requiredPrivilege)) {
      return res.status(403).json({ message: `Access denied: '${requiredPrivilege}' privilege required` });
    }

    next(); // allow access
  };
};
