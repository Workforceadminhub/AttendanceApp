export const getUser = () => {
  return JSON.parse(sessionStorage.getItem("authUser"));
};
