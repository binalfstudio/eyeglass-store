const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'eyeglass_db'
});

connection.connect((err) => {
    if (err) {
        console.error('MySQL connection failed:', err);
        return;
    }
    console.log('Connected to database');

    // First check if categories exist, if not create them
    const checkCategoriesQuery = 'SELECT id, name FROM categories';
    
    connection.query(checkCategoriesQuery, (err, results) => {
        if (err) {
            console.error('Error checking categories:', err);
            connection.end();
            return;
        }

        let categories = results;
        
        // If no categories exist, create default ones
        if (categories.length === 0) {
            const insertCategoriesQuery = `
                INSERT INTO categories (name, description) VALUES 
                ('Men\'s Glasses', 'Stylish eyeglasses for men'),
                ('Women\'s Glasses', 'Elegant eyeglasses for women'),
                ('Kids Glasses', 'Durable eyeglasses for children'),
                ('Sunglasses', 'UV protection sunglasses')
            `;
            
            connection.query(insertCategoriesQuery, (err) => {
                if (err) {
                    console.error('Error creating categories:', err);
                    connection.end();
                    return;
                }
                console.log('Categories created');
                
                // Get the newly created categories
                connection.query(checkCategoriesQuery, (err, newResults) => {
                    if (err) {
                        console.error('Error fetching new categories:', err);
                        connection.end();
                        return;
                    }
                    insertProducts(newResults);
                });
            });
        } else {
            insertProducts(categories);
        }
    });
});

function insertProducts(categories) {
    // Map category names to IDs
    const categoryMap = {};
    categories.forEach(cat => {
        categoryMap[cat.name] = cat.id;
    });

    // Default to first category if specific ones don't exist
    const defaultCategoryId = categories[0]?.id || 1;
    const mensId = categoryMap['Men\'s Glasses'] || defaultCategoryId;
    const womensId = categoryMap['Women\'s Glasses'] || defaultCategoryId;
    const kidsId = categoryMap['Kids Glasses'] || defaultCategoryId;
    const sunId = categoryMap['Sunglasses'] || defaultCategoryId;

    const products = [
        {
            name: 'Classic Round Frame',
            description: 'Timeless round frame design perfect for everyday wear. Lightweight and comfortable.',
            category_id: mensId,
            brand: 'RayVision',
            frame_type: 'Round',
            lens_type: 'Clear',
            frame_material: 'Acetate',
            quantity_in_stock: 45,
            buying_price: 80.00,
            selling_price: 129.99,
            image_url: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&h=500&fit=crop',
            prescription_required: 1
        },
        {
            name: 'Modern Rectangular',
            description: 'Sleek rectangular frames with a contemporary look. Professional and stylish.',
            category_id: mensId,
            brand: 'StyleCraft',
            frame_type: 'Rectangular',
            lens_type: 'Clear',
            frame_material: 'Metal',
            quantity_in_stock: 32,
            buying_price: 95.00,
            selling_price: 149.99,
            image_url: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&h=500&fit=crop',
            prescription_required: 1
        },
        {
            name: 'Vintage Cat Eye',
            description: 'Elegant cat eye frames with a retro twist. Perfect for a sophisticated look.',
            category_id: womensId,
            brand: 'GlamourOptics',
            frame_type: 'Cat Eye',
            lens_type: 'Clear',
            frame_material: 'Acetate',
            quantity_in_stock: 28,
            buying_price: 110.00,
            selling_price: 169.99,
            image_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=500&fit=crop',
            prescription_required: 1
        },
        {
            name: 'Titanium Ultra-Light',
            description: 'Premium titanium frames that are incredibly lightweight and durable.',
            category_id: mensId,
            brand: 'TitanEye',
            frame_type: 'Semi-Rimless',
            lens_type: 'Clear',
            frame_material: 'Titanium',
            quantity_in_stock: 15,
            buying_price: 150.00,
            selling_price: 229.99,
            image_url: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=400&h=500&fit=crop',
            prescription_required: 1
        },
        {
            name: 'Kids Flexible Frame',
            description: 'Durable and flexible frames designed specifically for active kids.',
            category_id: kidsId,
            brand: 'KidVision',
            frame_type: 'Round',
            lens_type: 'Clear',
            frame_material: 'TR90',
            quantity_in_stock: 50,
            buying_price: 45.00,
            selling_price: 79.99,
            image_url: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=400&h=500&fit=crop',
            prescription_required: 1
        },
        {
            name: 'Aviator Sunglasses',
            description: 'Classic aviator style with UV400 protection lenses. Timeless cool.',
            category_id: sunId,
            brand: 'SunShield',
            frame_type: 'Aviator',
            lens_type: 'Tinted',
            frame_material: 'Metal',
            quantity_in_stock: 38,
            buying_price: 70.00,
            selling_price: 119.99,
            image_url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=500&fit=crop',
            prescription_required: 0
        },
        {
            name: 'Wayfarer Style',
            description: 'Iconic wayfarer design that never goes out of style. Bold and versatile.',
            category_id: sunId,
            brand: 'SunShield',
            frame_type: 'Wayfarer',
            lens_type: 'Polarized',
            frame_material: 'Acetate',
            quantity_in_stock: 42,
            buying_price: 85.00,
            selling_price: 139.99,
            image_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=500&fit=crop',
            prescription_required: 0
        },
        {
            name: 'Designer Oval Frame',
            description: 'Elegant oval frames with intricate temple details. Luxury meets comfort.',
            category_id: womensId,
            brand: 'LuxeOptics',
            frame_type: 'Oval',
            lens_type: 'Clear',
            frame_material: 'Acetate',
            quantity_in_stock: 22,
            buying_price: 120.00,
            selling_price: 189.99,
            image_url: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&h=500&fit=crop',
            prescription_required: 1
        },
        {
            name: 'Sports Active Frame',
            description: 'Engineered for athletes with anti-slip nose pads and flexible temples.',
            category_id: mensId,
            brand: 'SportVision',
            frame_type: 'Wrap-around',
            lens_type: 'Clear',
            frame_material: 'TR90',
            quantity_in_stock: 35,
            buying_price: 90.00,
            selling_price: 149.99,
            image_url: 'https://images.unsplash.com/photo-1508296695146-257a814070b7?w=400&h=500&fit=crop',
            prescription_required: 1
        },
        {
            name: 'Rimless Minimalist',
            description: 'Ultra-minimalist rimless design for an barely-there look. Lightweight elegance.',
            category_id: womensId,
            brand: 'PureVision',
            frame_type: 'Rimless',
            lens_type: 'Clear',
            frame_material: 'Titanium',
            quantity_in_stock: 18,
            buying_price: 140.00,
            selling_price: 219.99,
            image_url: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=400&h=500&fit=crop',
            prescription_required: 1
        }
    ];

    // Check if products already exist
    const checkProductsQuery = 'SELECT COUNT(*) as count FROM eyeglasses';
    
    connection.query(checkProductsQuery, (err, results) => {
        if (err) {
            console.error('Error checking products:', err);
            connection.end();
            return;
        }

        if (results[0].count >= 10) {
            console.log(`Database already has ${results[0].count} products. Skipping insertion.`);
            console.log('To add new products, please delete existing ones first or modify this script.');
            connection.end();
            return;
        }

        console.log(`Database has ${results[0].count} products. Adding 10 more...`);

        // Insert all products
        let completed = 0;
        
        products.forEach((product) => {
            const insertQuery = `
                INSERT INTO eyeglasses 
                (name, description, category_id, brand, frame_type, lens_type, frame_material, 
                quantity_in_stock, buying_price, selling_price, image_url, prescription_required)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const values = [
                product.name,
                product.description,
                product.category_id,
                product.brand,
                product.frame_type,
                product.lens_type,
                product.frame_material,
                product.quantity_in_stock,
                product.buying_price,
                product.selling_price,
                product.image_url,
                product.prescription_required
            ];

            connection.query(insertQuery, values, (err, result) => {
                if (err) {
                    console.error(`Error inserting ${product.name}:`, err);
                } else {
                    console.log(`✓ Added: ${product.name} (ID: ${result.insertId})`);
                }
                
                completed++;
                if (completed === products.length) {
                    console.log('\n✅ Successfully added 10 products to the database!');
                    console.log('Refresh the Shop page to see the products.');
                    connection.end();
                }
            });
        });
    });
}
