const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const ownerModel = require('./models/ownerModel');
const bcrypt = require('bcryptjs');

const db = require("./config/mongooseConnections");
const multer = require('multer');
const userModel = require("./models/userModel");
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const productModel = require('./models/productModel');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());


const checkUserLoggedIn = (req, res, next) => {
    const token = req.cookies.token;
    req.userLoggedIn = false;

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_KEY);
            req.userLoggedIn = true;
            req.user = decoded;
        } catch (err) {
            console.error("Invalid Token", err);
        }
    }
    next();
};

app.use(checkUserLoggedIn);

app.get("/", (req, res) => {
    res.render("index", { userLoggedIn: req.userLoggedIn });
});

app.get("/shop", async (req, res) => {
    try {
        const products = await productModel.find();
        res.render("shop", { products, userLoggedIn: req.userLoggedIn });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/adminPanel", async (req, res) => {
    try {
        const products = await productModel.find();
        res.render("adminPanel", { products });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/adminLogin", (req, res) => {
    res.render("adminLogin");
});

app.post("/adminLogin", async (req, res) => {
    const { email, password } = req.body;
    const user = await ownerModel.findOne({ email: email });
    if (!user) return res.send("No Owner found");

    bcrypt.compare(password, user.password, async (err, result) => {
        if (result) {
            let token = jwt.sign({ id: user._id }, process.env.JWT_KEY, { expiresIn: '1h' });
            res.cookie("token", token);
            const products = await productModel.find();
            res.render("adminPanel", { products });
        } else {
            res.send("Incorrect password.");
        }
    });
});

app.get("/adminRegister", (req, res) => {
    res.render("adminRegister");
});

app.post("/adminRegister", async (req, res) => {
    const { ownerName, email, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    const ownerRegister = await ownerModel.create({
        ownerName,
        email,
        password: hash
    });

    let token = jwt.sign({ id: ownerRegister._id }, process.env.JWT_KEY, { expiresIn: '1h' });
    res.cookie("token", token);
    const products = await productModel.find();
    res.render("adminPanel", { products });
});

app.post("/create", upload.single("image"), async (req, res) => {
    try {
        const { name, price } = req.body;

        if (!req.file) {
            return res.status(400).send("Image file is required.");
        }

        await productModel.create({
            product: {
                name,
                price
            },
            picture: req.file.buffer 
        });

        res.redirect("/adminPanel");
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

app.get("/login", (req, res) => {
    res.render("userLogin", { userLoggedIn: req.userLoggedIn });
});

app.post("/login", async (req, res) => {
    let { email, password } = req.body;
    let user = await userModel.findOne({ email: email });
    if (!user) return res.send("No user found");

    bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
            let token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_KEY, { expiresIn: '1h' });
            res.cookie("token", token);
            res.redirect("/");
        } else {
            res.send("Incorrect password");
        }
    });
});

app.get("/register", (req, res) => {
    res.render("userRegister", { userLoggedIn: req.userLoggedIn });
});

app.post("/register", async (req, res) => {
    let { name, email, password } = req.body;
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let user = await userModel.create({
                name,
                email,
                password: hash
            });
            let token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_KEY, { expiresIn: '1h' });
            res.cookie("token", token);
            res.redirect("/");
        });
    });
});

app.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/");
});

app.get('/delete/:id', async (req, res) => {
    await productModel.findOneAndDelete({ _id: req.params.id });
    res.redirect("/adminPanel");
});

app.get("/edit/:id", async (req, res) => {
    try {
        const product = await productModel.findById(req.params.id);
        if (!product) {
            return res.status(404).send("Product not found");
        }
        res.render("edit", { product });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

app.post('/update/:productid', upload.single('image'), async (req, res) => {
    const { name, price } = req.body;
    const updateData = { 
        'product.name': name, 
        'product.price': price 
    };

    if (req.file) {
        updateData.picture = req.file.buffer; 
    }

    try {
        const updatedProduct = await productModel.findByIdAndUpdate(req.params.productid, updateData, { new: true });
        if (!updatedProduct) {
            return res.status(404).send("Product not found");
        }
        res.redirect("/adminPanel"); 
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/addtocart/:id", checkUserLoggedIn, async (req, res) => {
    if (!req.user) {
        return res.status(401).send("You need to be logged in to add items to your cart.");
    }

    let user = await userModel.findOne({ email: req.user.email });
    user.cart.push(req.params.id);
    await user.save();
    res.redirect("/shop");
});

app.get("/cart", checkUserLoggedIn, async (req, res) => {
    if (!req.user) {
        return res.redirect("/login");
    }

    try {
        let user = await userModel.findOne({ email: req.user.email }).populate("cart");
        res.render("cart", { user, userLoggedIn: req.userLoggedIn });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/removefromcart/:id", checkUserLoggedIn, async (req, res) => {
    if (!req.user) {
        return res.redirect("/login");
    }

    let user = await userModel.findOne({ email: req.user.email });
    const itemIndex = user.cart.indexOf(req.params.id);
    
    if (itemIndex > -1) {
        user.cart.splice(itemIndex, 1);
    }

    await user.save();
    res.redirect("/cart");
});

app.post("/checkout", checkUserLoggedIn, async (req, res) => {
    
    try {
        const user = await userModel.findOne({ email: req.user.email }).populate("cart");

        const lineItems = user.cart.map((item) => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.product.name,
                },
                unit_amount: item.product.price * 100,
            },
            quantity: 1,
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            shipping_address_collection: {
                allowed_countries : ['US', 'CA']
            },
            success_url: `${process.env.BASE_URL}/complete`,
            cancel_url: `${process.env.BASE_URL}/cancel`,   
        });

        res.redirect(303, session.url);

    } catch (error) {
        console.error("Checkout error:", error);
        res.status(500).send("Internal Server Error");
    }
});


app.get('/complete', (req, res) => {
    res.send('your payment was succesful')
})
app.get('/cancel', (req, res) => {
    res.redirect('/')
})

app.get("/about", (req, res) => {
    res.render("about", { userLoggedIn: req.userLoggedIn });
});1

app.get("/contact", (req, res) => {
    res.render("contact", { userLoggedIn: req.userLoggedIn });
});

app.listen(2000);
