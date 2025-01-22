// Conexão com o servidor Flask via WebSocket
let socket = io.connect('http://127.0.0.1:5000');

socket.on('connect', () => {
    console.log('Conectado ao servidor!');
});

socket.on('resposta', (msg) => {
    console.log('Resposta do servidor:', msg);
});

// Exibir o formulário de login ao clicar em "Jogar"
document.getElementById('jogar-btn').addEventListener('click', function() {
    const loginContainer = document.querySelector('.login-container');
    const jogarBtn = document.getElementById('jogar-btn');
    
    // Mostrar o formulário de login e esconder o botão
    loginContainer.style.display = 'block'; 
    jogarBtn.style.display = 'none'; 
    
    console.log('Botão Jogar clicado');
});

// Alternar a visibilidade da senha (olho ou macaco)
document.getElementById('togglePassword').addEventListener('click', function () {
    const passwordField = document.getElementById('password');
    const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordField.setAttribute('type', type);
    this.textContent = type === 'password' ? '👁️' : '🙈';
});

// Função para autenticar o login (Verifica se o usuário existe ou cria um novo)
document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();  // Impede o envio normal do formulário

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Verificação simples para garantir que o nome de usuário e a senha sejam fornecidos
    if (username && password.length) {
        // Envia os dados de login para o servidor Flask
        fetch('http://127.0.0.1:5000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                senha: password
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.mensagem) {
                alert(data.mensagem);  // Mensagem de sucesso ou erro
                if (data.mensagem.includes('sucesso')) {
                    // Oculta o formulário de login e exibe a tela do jogo
                    document.querySelector('.login-container').style.display = 'none';
                    alert('Jogo iniciado!');
                }
            } else if (data.erro) {
                alert(data.erro);  // Mensagem de erro
            }
        })
        .catch(error => console.error('Erro ao fazer login:', error));
    } else {
        alert('Por favor, insira um nome de usuário e uma senha válida.');
    }
});
