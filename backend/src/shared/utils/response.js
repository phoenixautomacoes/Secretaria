const success = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data });
};

const created = (res, data) => success(res, data, 201);

const noContent = (res) => res.status(204).send();

const paginated = (res, data, meta) => {
  return res.status(200).json({ success: true, data, meta });
};

module.exports = { success, created, noContent, paginated };
