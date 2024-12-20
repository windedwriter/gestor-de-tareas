<?php
// Configuración de cabeceras para CORS y JSON
header('Access-Control-Allow-Origin: https://windedwriter.github.io');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Manejo preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configuración de la base de datos para InfinityFree
define('DB_HOST', 'sql311.infinityfree.com');
define('DB_USER', 'if0_37944823');
define('DB_PASS', 'LHjPUvjUj2nA');
define('DB_NAME', 'if0_37944823_local_sistem');

// Función para conectar a la base de datos
function connectDB() {
    try {
        $conn = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $conn->exec("SET CHARACTER SET utf8");

        // Crear tablas si no existen
        $conn->exec("CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            email VARCHAR(100) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        $conn->exec("CREATE TABLE IF NOT EXISTS tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            start_date DATE NOT NULL,
            priority VARCHAR(50) NOT NULL,
            category VARCHAR(100) NOT NULL,
            completed BOOLEAN DEFAULT FALSE,
            completed_date DATETIME DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )");

        return $conn;
    } catch (PDOException $e) {
        http_response_code(500);
        die(json_encode([
            'success' => false,
            'message' => 'Error de conexión: ' . $e->getMessage()
        ]));
    }
}

// Leer y validar datos JSON de la solicitud
$raw_data = file_get_contents("php://input");
$data = json_decode($raw_data);

if (!$raw_data || json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Datos JSON inválidos'
    ]);
    exit;
}

if (!isset($data->action)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Acción no especificada'
    ]);
    exit;
}

try {
    $conn = connectDB();

    switch ($data->action) {
        case 'register':
            if (!isset($data->username, $data->email, $data->password)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Faltan datos requeridos'
                ]);
                exit;
            }

            // Verificar email
            $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$data->email]);
            if ($stmt->rowCount() > 0) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'message' => 'El correo ya está registrado'
                ]);
                exit;
            }

            // Verificar username
            $stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
            $stmt->execute([$data->username]);
            if ($stmt->rowCount() > 0) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'message' => 'El nombre de usuario ya está en uso'
                ]);
                exit;
            }

            // Registrar usuario
            $hashedPassword = password_hash($data->password, PASSWORD_DEFAULT);
            $stmt = $conn->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
            $stmt->execute([$data->username, $data->email, $hashedPassword]);

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Usuario registrado exitosamente'
            ]);
            break;

        case 'login':
            if (!isset($data->email, $data->password)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Faltan datos requeridos'
                ]);
                exit;
            }

            // Validar el formato del email
            if (!filter_var($data->email, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Formato de email inválido'
                ]);
                exit;
            }

            // Buscar usuario por email
            $stmt = $conn->prepare("SELECT id, username, email, password FROM users WHERE email = ?");
            $stmt->execute([$data->email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && password_verify($data->password, $user['password'])) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Inicio de sesión exitoso',
                    'user' => [
                        'id' => $user['id']
                    ]
                ]);
            } else {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'message' => 'Credenciales incorrectas'
                ]);
            }
            break;

        case 'getUserData':
            if (!isset($data->userId)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'ID de usuario no proporcionado'
                ]);
                exit;
            }

            $stmt = $conn->prepare("SELECT id, username, email, created_at FROM users WHERE id = ?");
            $stmt->execute([$data->userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user) {
                echo json_encode([
                    'success' => true,
                    'user' => $user
                ]);
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Usuario no encontrado'
                ]);
            }
            break;

        case 'getTasks':
            if (!isset($data->userId)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'ID de usuario no proporcionado'
                ]);
                exit;
            }

            $stmt = $conn->prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC");
            $stmt->execute([$data->userId]);
            $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'tasks' => $tasks
            ]);
            break;

        case 'addTask':
            if (!isset($data->userId, $data->title, $data->startDate, $data->priority, $data->category)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Faltan datos requeridos para la tarea'
                ]);
                exit;
            }

            $stmt = $conn->prepare("INSERT INTO tasks (user_id, title, start_date, priority, category) 
                               VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([
                $data->userId,
                $data->title,
                $data->startDate,
                $data->priority,
                $data->category
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Tarea agregada correctamente'
            ]);
            break;

        case 'updateTask':
            if (!isset($data->taskId, $data->userId, $data->title, $data->startDate, $data->priority, $data->category)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Faltan datos requeridos'
                ]);
                exit;
            }

            $stmt = $conn->prepare("UPDATE tasks SET title = ?, start_date = ?, priority = ?, category = ? 
                               WHERE id = ? AND user_id = ?");
            $stmt->execute([
                $data->title,
                $data->startDate,
                $data->priority,
                $data->category,
                $data->taskId,
                $data->userId
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Tarea actualizada correctamente'
            ]);
            break;

        case 'completeTask':
            if (!isset($data->taskId, $data->userId)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Faltan datos requeridos'
                ]);
                exit;
            }

            $stmt = $conn->prepare("UPDATE tasks SET completed = true, completed_date = NOW() 
                               WHERE id = ? AND user_id = ?");
            $stmt->execute([$data->taskId, $data->userId]);

            echo json_encode([
                'success' => true,
                'message' => 'Tarea marcada como completada'
            ]);
            break;

        case 'clearTasks':
            if (!isset($data->userId)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'ID de usuario no proporcionado'
                ]);
                exit;
            }

            $stmt = $conn->prepare("DELETE FROM tasks WHERE user_id = ?");
            $stmt->execute([$data->userId]);

            echo json_encode([
                'success' => true,
                'message' => 'Todas las tareas han sido eliminadas'
            ]);
            break;

        default:
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Acción no válida'
            ]);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en el servidor: ' . $e->getMessage()
    ]);
}
?>
