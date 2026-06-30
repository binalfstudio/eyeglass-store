const mysql = require('mysql2');
const { getMysqlConfig } = require('../utils/securityConfig');

const dbConfig = getMysqlConfig();
let connection;
let lastConnectionError = null;

const rememberConnectionError = (context, err) => {
    lastConnectionError = err;
    console.error(`${context}:`, err);
};

// First connect without database to create it if needed
const tempConnection = mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
});

tempConnection.connect((err) => {
    if (err) {
        rememberConnectionError('MySQL connection failed', err);
        return;
    }
    
    tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``, (err) => {
        if (err) {
            rememberConnectionError('Error creating database', err);
            return;
        }
        console.log(`Database ${dbConfig.database} is ready`);
        tempConnection.end();
        
        // Now connect with the database
        initializeConnection();
    });
});

function initializeConnection() {
    connection = mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
    });

    connection.connect((err) => {
        if (err) {
            connection = null;
            rememberConnectionError('MySQL connection failed', err);
            return;
        }
        lastConnectionError = null;
        console.log('MySQL connected successfully');
        
        // Create categories table
        const createCategoriesTableQuery = `
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        connection.query(createCategoriesTableQuery, (err) => {
            if (err) {
                console.error('Error creating categories table:', err);
            } else {
                console.log('Categories table is ready');
            }
        });

        // Create eyeglasses table
        const createEyeglassesTableQuery = `
            CREATE TABLE IF NOT EXISTS eyeglasses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category_id INT,
                brand VARCHAR(255) DEFAULT NULL,
                frame_type VARCHAR(100) DEFAULT NULL,
                lens_type VARCHAR(100) DEFAULT NULL,
                frame_material VARCHAR(100) DEFAULT NULL,
                quantity_in_stock INT NOT NULL DEFAULT 0,
                buying_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                selling_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                image_url VARCHAR(512) DEFAULT NULL,
                prescription_required TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_eyeglasses_category
                    FOREIGN KEY (category_id) REFERENCES categories(id)
                    ON DELETE SET NULL
            )
        `;

        connection.query(createEyeglassesTableQuery, (err) => {
            if (err) {
                console.error('Error creating eyeglasses table:', err);
            } else {
                console.log('Eyeglasses table is ready');
                // Migrate existing databases
                const alterQueries = [
                    `ALTER TABLE eyeglasses ADD COLUMN IF NOT EXISTS brand VARCHAR(255) DEFAULT NULL`,
                    `ALTER TABLE eyeglasses ADD COLUMN IF NOT EXISTS frame_type VARCHAR(100) DEFAULT NULL`,
                    `ALTER TABLE eyeglasses ADD COLUMN IF NOT EXISTS lens_type VARCHAR(100) DEFAULT NULL`,
                    `ALTER TABLE eyeglasses ADD COLUMN IF NOT EXISTS frame_material VARCHAR(100) DEFAULT NULL`,
                    `ALTER TABLE eyeglasses ADD COLUMN IF NOT EXISTS quantity_in_stock INT NOT NULL DEFAULT 0`,
                    `ALTER TABLE eyeglasses ADD COLUMN IF NOT EXISTS buying_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00`,
                    `ALTER TABLE eyeglasses ADD COLUMN IF NOT EXISTS selling_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00`,
                    `ALTER TABLE eyeglasses ADD COLUMN IF NOT EXISTS image_url VARCHAR(512) DEFAULT NULL`,
                    `ALTER TABLE eyeglasses ADD COLUMN IF NOT EXISTS prescription_required TINYINT(1) NOT NULL DEFAULT 0`,
                    `ALTER TABLE eyeglasses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
                ];
                alterQueries.forEach((q) => connection.query(q, () => {}));
            }
        });

        // Create uploads table
        const createUploadsTableQuery = `
            CREATE TABLE IF NOT EXISTS uploads (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                original_name VARCHAR(512) NOT NULL,
                filename VARCHAR(512) NOT NULL,
                file_path VARCHAR(1024) NOT NULL,
                mimetype VARCHAR(128) NOT NULL,
                size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_uploads_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `;

        connection.query(createUploadsTableQuery, (err) => {
            if (err) {
                console.error('Error creating uploads table:', err);
            } else {
                console.log('Uploads table is ready');
            }
        });

        // Create users table
        const createUsersTableQuery = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(50) DEFAULT NULL,
                address TEXT DEFAULT NULL,
                profile_image LONGTEXT DEFAULT NULL,
                isAdmin TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        connection.query(createUsersTableQuery, (err) => {
            if (err) {
                console.error('Error creating users table:', err);
            } else {
                console.log('Users table is ready');
                // Add isAdmin column if missing (migration)
                const alterUsersQuery = `ALTER TABLE users ADD COLUMN IF NOT EXISTS isAdmin TINYINT(1) NOT NULL DEFAULT 0`;
                connection.query(alterUsersQuery, () => {});
                const alterUsersProfileImageQuery = `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image LONGTEXT DEFAULT NULL`;
                connection.query(alterUsersProfileImageQuery, () => {});
            }
        });

        // Create cart table
        const createCartTableQuery = `
            CREATE TABLE IF NOT EXISTS cart (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                eyeglass_id INT NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (eyeglass_id) REFERENCES eyeglasses(id) ON DELETE CASCADE
            )
        `;

        connection.query(createCartTableQuery, (err) => {
            if (err) {
                console.error('Error creating cart table:', err);
            } else {
                console.log('Cart table is ready');
            }
        });

        // Create orders table
        const createOrdersTableQuery = `
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending_payment',
                currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
                subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                shipping DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                tax DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                stripe_session_id VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_orders_user
                    FOREIGN KEY (user_id) REFERENCES users(id)
                    ON DELETE CASCADE,
                INDEX idx_orders_user_id (user_id),
                INDEX idx_orders_status (status)
            )
        `;

        connection.query(createOrdersTableQuery, (err) => {
            if (err) {
                console.error('Error creating orders table:', err);
            } else {
                console.log('Orders table is ready');
            }
        });

        // Create order_items table
        const createOrderItemsTableQuery = `
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                eyeglass_id INT NOT NULL,
                product_name VARCHAR(255) NOT NULL,
                unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                quantity INT NOT NULL DEFAULT 1,
                line_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_order_items_order
                    FOREIGN KEY (order_id) REFERENCES orders(id)
                    ON DELETE CASCADE,
                CONSTRAINT fk_order_items_eyeglass
                    FOREIGN KEY (eyeglass_id) REFERENCES eyeglasses(id)
                    ON DELETE RESTRICT,
                INDEX idx_order_items_order_id (order_id)
            )
        `;

        connection.query(createOrderItemsTableQuery, (err) => {
            if (err) {
                console.error('Error creating order_items table:', err);
            } else {
                console.log('Order items table is ready');
            }
        });

        // Create payment_transactions table
        const createPaymentTransactionsTableQuery = `
            CREATE TABLE IF NOT EXISTS payment_transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                user_id INT NOT NULL,
                stripe_session_id VARCHAR(255) NOT NULL,
                stripe_payment_intent_id VARCHAR(255) DEFAULT NULL,
                amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
                payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_payment_session (stripe_session_id),
                CONSTRAINT fk_payment_transactions_order
                    FOREIGN KEY (order_id) REFERENCES orders(id)
                    ON DELETE CASCADE,
                CONSTRAINT fk_payment_transactions_user
                    FOREIGN KEY (user_id) REFERENCES users(id)
                    ON DELETE CASCADE,
                INDEX idx_payment_transactions_order_id (order_id)
            )
        `;

        connection.query(createPaymentTransactionsTableQuery, (err) => {
            if (err) {
                console.error('Error creating payment_transactions table:', err);
            } else {
                console.log('Payment transactions table is ready');
            }
        });

        // Create admin_notifications table
        const createAdminNotificationsTableQuery = `
            CREATE TABLE IF NOT EXISTS admin_notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type VARCHAR(80) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                metadata JSON DEFAULT NULL,
                is_read TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_admin_notifications_is_read (is_read),
                INDEX idx_admin_notifications_created_at (created_at)
            )
        `;

        connection.query(createAdminNotificationsTableQuery, (err) => {
            if (err) {
                console.error('Error creating admin_notifications table:', err);
            } else {
                console.log('Admin notifications table is ready');
            }
        });

        // Create payment_screenshots table
        const createPaymentScreenshotsTableQuery = `
            CREATE TABLE IF NOT EXISTS payment_screenshots (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                user_id INT NOT NULL,
                screenshot_path VARCHAR(1024) NOT NULL,
                original_name VARCHAR(512) NOT NULL,
                notes TEXT DEFAULT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                admin_note TEXT DEFAULT NULL,
                reviewed_at TIMESTAMP NULL DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_ps_order
                    FOREIGN KEY (order_id) REFERENCES orders(id)
                    ON DELETE CASCADE,
                CONSTRAINT fk_ps_user
                    FOREIGN KEY (user_id) REFERENCES users(id)
                    ON DELETE CASCADE,
                INDEX idx_ps_user_id (user_id),
                INDEX idx_ps_order_id (order_id),
                INDEX idx_ps_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `;

        connection.query(createPaymentScreenshotsTableQuery, (err) => {
            if (err) {
                console.error('Error creating payment_screenshots table:', err);
            } else {
                console.log('Payment screenshots table is ready');
            }
        });

        // Create user_notifications table (for notifying individual users)
        const createUserNotificationsTableQuery = `
            CREATE TABLE IF NOT EXISTS user_notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                type VARCHAR(80) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                metadata JSON DEFAULT NULL,
                is_read TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_un_user
                    FOREIGN KEY (user_id) REFERENCES users(id)
                    ON DELETE CASCADE,
                INDEX idx_un_user_id (user_id),
                INDEX idx_un_is_read (is_read),
                INDEX idx_un_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `;

        connection.query(createUserNotificationsTableQuery, (err) => {
            if (err) {
                console.error('Error creating user_notifications table:', err);
            } else {
                console.log('User notifications table is ready');
            }
        });
    });
}

module.exports = {
    getConnection: () => connection,
    isDatabaseConnected: () => Boolean(connection),
    getDatabaseError: () => lastConnectionError,
};
