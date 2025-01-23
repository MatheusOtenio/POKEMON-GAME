
from flask import Flask, jsonify, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_socketio import SocketIO
import os


# Configuração do Flask
app = Flask(__name__, static_folder=os.path.join(os.path.abspath(os.path.dirname(__file__)), "../frontend"), static_url_path="/")
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


# Modelo de Usuário
class Usuario(db.Model):
    __tablename__ = 'usuario'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    senha = db.Column(db.String(100), nullable=False)

    # Relacionamento com os personagens
    personagens = db.relationship('Personagem', backref='usuario', lazy=True)

    def __repr__(self):
        return f'<Usuario {self.username}>'

# Modelo de Personagem
class Personagem(db.Model):
    __tablename__ = 'personagem'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    genero = db.Column(db.String(10), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)

    # Relacionamento com os itens (mochila)
    itens = db.relationship('Item', backref='personagem', lazy=True)

    def __repr__(self):
        return f'<Personagem {self.nome} - {self.genero}>'

# Modelo de Item (Mochila)
class Item(db.Model):
    __tablename__ = 'item'
    id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(50), nullable=False)  # Tipo do item (Pokéball, etc.)
    pokemon_id = db.Column(db.Integer, nullable=False)  # Referência ao Pokémon dentro da bola
    personagem_id = db.Column(db.Integer, db.ForeignKey('personagem.id'), nullable=False)

    def __repr__(self):
        return f'<Item {self.tipo} - Pokémon ID: {self.pokemon_id}>'



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


# Rota para retornar os personagens de um usuário
@app.route('/personagens/<string:username>', methods=['GET'])
def listar_personagens(username):
    usuario = Usuario.query.filter_by(username=username).first()
    if not usuario:
        return jsonify({"erro": "Usuário não encontrado!"}), 404

    personagens = [
        {
            "id": p.id,
            "nome": p.nome,
            "genero": p.genero,
            "mochila": [{"tipo": i.tipo, "pokemon_id": i.pokemon_id} for i in p.itens]
        }
        for p in usuario.personagens
    ]

    return jsonify({"username": usuario.username, "personagens": personagens})


# Rota para criação de personagens
@app.route('/criar_personagem', methods=['POST'])
def criar_personagem():
    data = request.get_json()
    username = data.get('username')
    nome = data.get('nome')
    genero = data.get('genero')

    # Verifica se o usuário existe
    usuario = Usuario.query.filter_by(username=username).first()
    if not usuario:
        return jsonify({"erro": "Usuário não encontrado!"}), 404

    # Verifica se o usuário já tem 3 personagens
    if len(usuario.personagens) >= 3:
        return jsonify({"erro": "Limite de 3 personagens atingido!"}), 400

    # Cria um novo personagem
    novo_personagem = Personagem(nome=nome, genero=genero, usuario_id=usuario.id)
    db.session.add(novo_personagem)
    db.session.commit()

    # Log no terminal de que o personagem foi criado com sucesso
    app.logger.info(f"Personagem {nome} ({genero}) criado para o usuário {username}.")

    return jsonify({"mensagem": f"Personagem {nome} criado com sucesso!"})



# Rota para adicionar um item à mochila do personagem
@app.route('/adicionar_item', methods=['POST'])
def adicionar_item():
    data = request.get_json()
    personagem_id = data.get('personagem_id')
    tipo_bola = data.get('tipo')
    pokemon_id = data.get('pokemon_id')

    # Verifica se o personagem existe
    personagem = Personagem.query.get(personagem_id)
    if not personagem:
        return jsonify({"erro": "Personagem não encontrado!"}), 404

    # Verifica se a mochila já tem 100 itens
    if len(personagem.itens) >= 100:
        return jsonify({"erro": "Mochila cheia! Não é possível adicionar mais itens."}), 400

    # Adiciona um novo item à mochila do personagem
    novo_item = Item(tipo=tipo_bola, pokemon_id=pokemon_id, personagem_id=personagem.id)
    db.session.add(novo_item)
    db.session.commit()

    # Log no terminal de que o item foi adicionado à mochila
    app.logger.info(f"Item {tipo_bola} (Pokémon ID: {pokemon_id}) adicionado à mochila do personagem {personagem.nome}.")

    return jsonify({"mensagem": f"Item {tipo_bola} adicionado à mochila do personagem {personagem.nome}!"})



# Comunicação via WebSocket
@socketio.on('mensagem')
def handle_mensagem(msg):
    print("Mensagem recebida:", msg)
    resposta = f"Mensagem processada: {msg}"
    socketio.emit('resposta', resposta)

if __name__ == "__main__":
    socketio.run(app, debug=True)

if __name__ == "__main__":
    socketio.run(app, debug=True)
