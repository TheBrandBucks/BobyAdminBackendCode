export const isSuperAdmin = (req, res, next) => {
  console.log("User role is:", req.user?.role);
  if (req.user?.role !== 'superAdmin') {

    //req se aane wala user jb authorised ho jy ga to req me is user ko add kr de ge or user ki details me us ka role bhi he
    return res.status(403).json({ message: 'Access denied: SuperAdmin only' });
  }
  next();
};
