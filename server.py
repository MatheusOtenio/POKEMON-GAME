from flask import Flask, jsonify, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_socketio import SocketIO
import os

# Configuração do Flask
app = Flask(__name__, static_folder="../frontend", static_url_path="/")
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql://pokemon_user:1234@localhost/pokemon_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Log de requisições recebidas
@app.before_request
def log_request_info():
    app.logger.info(f"Requisição recebida: {request.method} {request.path}")

# Serve o index.html
@app.route('/')
def home():
    return send_from_directory(app.static_folder, 'index.html')

# Serve arquivos estáticos (JS, CSS, imagens)
@app.route('/<path:filename>')
def static_files(filename):
    file_path = os.path.join(app.static_folder, filename)
    if os.path.exists(file_path):
        return send_from_directory(app.static_folder, filename)
    return jsonify({"erro": "Arquivo não encontrado"}), 404

# Modelo de Usuário para o banco de dados
class Usuario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    senha = db.Column(db.String(100), nullable=False)

    def __repr__(self):
        return f'<Usuario {self.username}>'

# Criação do banco de dados e tabelas, caso não existam
with app.app_context():
    db.create_all()  # Cria as tabelas no banco de dados se não existirem

# Rota para fazer login ou criar um novo usuário
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    senha = data.get('senha')

    if not username or not senha:
        return jsonify({"erro": "Username e senha são obrigatórios!"}), 400

    # Verifica se o usuário já existe
    usuario = Usuario.query.filter_by(username=username).first()

    if usuario:
        # Se o usuário existir, verifica a senha
        if usuario.senha == senha:
            app.logger.info(f"Login bem-sucedido para o usuário {username}")
            return jsonify({"mensagem": "Login realizado com sucesso!"})
        else:
            app.logger.warning(f"Falha no login: senha incorreta para o usuário {username}")
            return jsonify({"erro": "Credenciais inválidas!"}), 400
    else:
        # Se o usuário não existir, cria um novo usuário
        novo_usuario = Usuario(username=username, senha=senha)
        db.session.add(novo_usuario)
        db.session.commit()
        app.logger.info(f"Novo usuário criado: {username}")
        return jsonify({"mensagem": "Novo usuário criado e login realizado com sucesso!"})

# Comunicação via WebSocket
@socketio.on('mensagem')
def handle_mensagem(msg):
    print("Mensagem recebida:", msg)
    resposta = f"Mensagem processada: {msg}"
    socketio.emit('resposta', resposta)

if __name__ == "__main__":
    socketio.run(app, debug=True)
