const Product = require("../../models/product.model");
const ProductCategory = require("../../models/product-category.model");
const Account = require("../../models/account.model");

const systemConfig = require("../../config/system");

const filterStatusHelper = require("../../helpers/filterStatus");
const searchHelper = require("../../helpers/search");
const paginationHelper = require("../../helpers/pagination");
const createTree = require("../../helpers/createTree");

// [GET] /admin/products
module.exports.index = async (req, res) => {
  try {
    //Tý viết code đoạn này
    const filterStatus = filterStatusHelper(req.query);
    let objectSearch = searchHelper(req.query);

    let find = {
      deleted: false,
    };

    if (req.query.status) {
      find.status = req.query.status;
    }

    if (req.query.keyword) {
      find.title = objectSearch.regex;
    }

    // Pagination
    let initPagination = {
      currentPage: 1,
      limitItems: 4,
    };
    const countProducts = await Product.count(find);
    const objectPagination = paginationHelper(
      initPagination,
      req.query,
      countProducts
    );
    // End Pagination

    // Sort
    let sort = {};

    if(req.query.sortKey && req.query.sortValue) {
      sort[req.query.sortKey] = req.query.sortValue;
    } else {
      sort.position = "desc";
    }
    // End Sort

    const products = await Product.find(find)
      .sort(sort)
      .limit(objectPagination.limitItems)
      .skip(objectPagination.skip);

    for (const product of products) {
      // Lấy ra người tạo
      const userCreated = await Account.findOne({
        _id: product.createdBy.account_id
      });

      if(userCreated) {
        product.createdBy.accountFullName = userCreated.fullName;
      }

      // Lấy ra người sửa
      const userUpdatedId = product.updatedBy.slice(-1)[0];
      if(userUpdatedId) {
        const userUpdated = await Account.findOne({
          _id: userUpdatedId.account_id
        });
    
        if(userUpdated) {
          userUpdatedId.accountFullName = userUpdated.fullName;
        }
      }
    }

    if (products.length > 0 || countProducts == 0) {
      res.render("admin/pages/products/index", {
        pageTitle: "Danh sách sản phẩm",
        products: products,
        filterStatus: filterStatus,
        keyword: objectSearch.keyword,
        pagination: objectPagination,
      });
    } else {
      let stringQuery = "";

      for (const key in req.query) {
        if (key != "page") {
          stringQuery += `&${key}=${req.query[key]}`;
        }
      }

      const href = `${req.baseUrl}?page=1${stringQuery}`;

      res.redirect(href);
    }
  } catch (error) {
    res.redirect("back");
  }
};

// [PATCH] /admin/products/change-status/:status/:id
module.exports.changeStatus = async (req, res) => {
  const status = req.params.status;
  const id = req.params.id;

  const updatedBy = {
    account_id: res.locals.user.id,
    updatedAt: new Date(),
  };

  await Product.updateOne({ _id: id }, {
    status: status,
    $push: { updatedBy: updatedBy }
  });

  req.flash("success", "Cập nhật trạng thái thành công!");

  res.redirect("back");
};

// [PATCH] /admin/products/change-multi
module.exports.changeMulti = async (req, res) => {
  const type = req.body.type;
  const ids = req.body.ids.split(", ");

  const updatedBy = {
    account_id: res.locals.user.id,
    updatedAt: new Date(),
  };

  switch (type) {
    case "active":
    case "inactive":
      await Product.updateMany({ _id: { $in: ids } }, {
        status: type,
        $push: { updatedBy: updatedBy }
      });
      req.flash("success", `Cập nhật trạng thái thành công ${ids.length} sản phẩm!`);
      break;
    case "delete-all":
      await Product.updateMany(
        { _id: { $in: ids } },
        {
          deleted: true,
          // deletedAt: new Date(),
          deletedBy: {
            account_id: res.locals.user.id,
            deletedAt: new Date(),
          }
        }
      );
      req.flash("success", `Xóa thành công ${ids.length} sản phẩm!`);
      break;
    case "change-position":
      for (const item of ids) {
        const [id, position] = item.split("-");
        await Product.updateOne({ _id: id }, {
          position: position,
          $push: { updatedBy: updatedBy }
        });
      }
      req.flash("success", `Thay đổi vị trí thành công ${ids.length} sản phẩm!`);
      break;
    default:
      break;
  }

  res.redirect("back");
};

// [DELETE] /admin/products/delete/:id
module.exports.deleteItem = async (req, res) => {
  const id = req.params.id;

  // await Product.deleteOne({ _id: id });
  await Product.updateOne(
    { _id: id },
    {
      deleted: true,
      // deletedAt: new Date(),
      deletedBy: {
        account_id: res.locals.user.id,
        deletedAt: new Date(),
      }
    }
  );

  req.flash("success", `Xóa thành công sản phẩm!`);

  res.redirect("back");
};

// [GET] /admin/products/create
module.exports.create = async (req, res) => {
  let find = {
    deleted: false
  }

  const records = await ProductCategory.find(find);

  const newRecords = createTree(records);

  res.render("admin/pages/products/create", {
    pageTitle: "Tạo mới sản phẩm",
    records: newRecords
  });
};

// [POST] /admin/products/create
module.exports.createPost = async (req, res) => {
  const permissions = res.locals.role.permissions;

  // if(permissions.includes("products_create")) {
  //   console.log("Cho tạo mới");
  // } else {
  //   return;
  // }

  req.body.price = parseInt(req.body.price);
  req.body.discountPercentage = parseInt(req.body.discountPercentage);
  req.body.stock = parseInt(req.body.stock);

  if(req.body.position === "") {
    const countProducts = await Product.countDocuments();
    req.body.position = countProducts + 1;
  } else {
    req.body.position = parseInt(req.body.position);
  }

  req.body.createdBy = {
    account_id: res.locals.user.id
  };

  const product = new Product(req.body);
  await product.save();

  res.redirect(`/${systemConfig.prefixAdmin}/products`);
};

// [GET] /admin/products/edit/:id
module.exports.edit = async (req, res) => {
  try {
    const id = req.params.id;

    const product = await Product.findOne({
      _id: id,
      deleted: false
    });
  
    const records = await ProductCategory.find({
      deleted: false
    });
  
    const newRecords = createTree(records);

    res.render("admin/pages/products/edit", {
      pageTitle: "Chỉnh sửa sản phẩm",
      product: product,
      records: newRecords
    });
  } catch (error) {
    res.redirect(`/${systemConfig.prefixAdmin}/products`);
  }
};

// [PATCH] /admin/products/edit/:id
module.exports.editPatch = async (req, res) => {
  const id = req.params.id;

  req.body.price = parseInt(req.body.price);
  req.body.discountPercentage = parseInt(req.body.discountPercentage);
  req.body.stock = parseInt(req.body.stock);

  req.body.position = parseInt(req.body.position);

  if(req.file && req.file.filename) {
    req.body.thumbnail = `/uploads/${req.file.filename}`;
  }

  const updatedBy = {
    account_id: res.locals.user.id,
    updatedAt: new Date(),
  };

  await Product.updateOne({ _id: id }, {
    ...req.body,
    $push: { updatedBy: updatedBy }
  });

  req.flash("success", "Cập nhật sản phẩm thành công!");

  res.redirect("back");
};

// [GET] /admin/products/detail/:id
module.exports.detail = async (req, res) => {
  try {
    const id = req.params.id;

    const product = await Product.findOne({
      _id: id,
      deleted: false
    });

    res.render("admin/pages/products/detail", {
      pageTitle: "Chi tiết sản phẩm",
      product: product
    });
  } catch (error) {
    res.redirect(`/${systemConfig.prefixAdmin}/products`);
  }
};