
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


// Chamar a Função Após o Login para Buscar Personagens
async function login(username, senha) {
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, senha })
        });

        const data = await response.json();

        if (response.ok) {
            console.log("Login bem-sucedido:", data.mensagem);
            alert("Login realizado com sucesso!");

            // Busca os personagens do usuário após o login
            const personagens = await buscarPersonagens(username);

            // Exibe os personagens no console ou atualiza o DOM
            exibirPersonagens(personagens);
        } else {
            console.error("Erro no login:", data.erro);
            alert("Erro no login: " + data.erro);
        }
    } catch (error) {
        console.error("Erro ao fazer login:", error);
        alert("Erro ao fazer login.");
    }
}


// Função para Buscar Personagens
async function buscarPersonagens(username) {
    try {
        // Faz uma requisição GET para a API Flask
        const response = await fetch(`/personagens/${username}`);

        // Verifica se a resposta foi bem-sucedida
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Erro ao buscar personagens:", errorData.erro);
            alert("Erro ao buscar personagens: " + errorData.erro);
            return [];
        }

        // Converte a resposta para JSON
        const data = await response.json();
        console.log("Personagens do usuário:", data.personagens);

        // Retorna os personagens
        return data.personagens;
    } catch (error) {
        console.error("Erro na comunicação com o servidor:", error);
        alert("Erro na comunicação com o servidor.");
        return [];
    }
}


// Exibir personagens
function exibirPersonagens(personagens) {
    const container = document.getElementById("personagens-container");
    container.innerHTML = ""; // Limpa o conteúdo anterior

    const totalSlots = 3; // Limite de personagens por usuário
    let personagensExistentes = personagens.length;

    for (let i = 1; i <= totalSlots; i++) {
        const personagemDiv = document.createElement("div");
        personagemDiv.classList.add("personagem-slot");

        if (i <= personagensExistentes) {
            // Exibe os personagens existentes
            const personagem = personagens[i - 1];

            // Define o caminho da imagem com base no gênero
            const imagemSrc = personagem.genero === "Masculino"
                ? "/imagens/personagem-menino.png"
                : "/imagens/personagem-menina.png";

            personagemDiv.innerHTML = `
                <img src="${imagemSrc}" alt="Imagem do personagem" class="personagem-imagem">
                <h3>Personagem ${i}</h3>
                <p><strong>Nome:</strong> ${personagem.nome}</p>
                <p><strong>Gênero:</strong> ${personagem.genero}</p>
                <h4>Mochila:</h4>
                <ul>
                    ${personagem.mochila.map(item => `<li>${item.tipo} (Pokémon ID: ${item.pokemon_id})</li>`).join("")}
                </ul>
            `;
        } else {
            // Espaços vazios com botão para criar personagem
            personagemDiv.innerHTML = `
                <h3>Personagem ${i}</h3>
                <button class="add-character-btn" data-slot="${i}">Criar Personagem</button>
            `;
        }

        container.appendChild(personagemDiv);
    }

    // Adiciona eventos aos botões de criação de personagem
    document.querySelectorAll('.add-character-btn').forEach(button => {
        button.addEventListener('click', () => {
            const slot = button.getAttribute('data-slot');
            abrirMenuCriacao(slot);
        });
    });
}


// Função para abrir o menu de criação de personagem
function abrirMenuCriacao(slot) {
    const modal = document.getElementById('create-character-modal');
    modal.style.display = 'block';

    // Configura o botão de criar personagem
    const createBtn = document.getElementById('create-character-btn');
    createBtn.onclick = async function () {
        const name = document.getElementById('character-name').value;
        const gender = document.querySelector('input[name="gender"]:checked')?.value;

        if (!name || !gender) {
            alert("Por favor, preencha todas as informações!");
            return;
        }

        try {
            // Faz o POST para criar o personagem
            const response = await fetch('/criar_personagem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: localStorage.getItem('username'), nome: name, genero: gender }),
            });

            if (response.ok) {
                alert("Personagem criado com sucesso!");
                modal.style.display = 'none';

                // Atualiza a lista de personagens
                const personagens = await buscarPersonagens(localStorage.getItem('username'));
                exibirPersonagens(personagens);
            } else {
                const errorData = await response.json();
                alert("Erro ao criar personagem: " + errorData.erro);
            }
        } catch (error) {
            console.error("Erro na criação do personagem:", error);
            alert("Erro ao conectar com o servidor.");
        }
    };

    // Configura o botão de cancelar
    document.getElementById('cancel-creation-btn').onclick = function () {
        modal.style.display = 'none';
    };
}


// Função para inicializar o menu de seleção de personagem
function inicializarSelecaoDePersonagem() {
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', function (event) {
        event.preventDefault();
        document.querySelector('.login-container').style.display = 'none';
        document.querySelector('.character-selection').style.display = 'block';

        // Busca os personagens do usuário após o login
        const username = localStorage.getItem('username');
        if (username) {
            buscarPersonagens(username).then(personagens => exibirPersonagens(personagens));
        }
    });
}

// Eventos globais
document.addEventListener('DOMContentLoaded', function () {
    inicializarSelecaoDePersonagem();

    // Adiciona evento ao botão de abrir criação de personagem
    document.querySelectorAll('.add-character-btn').forEach(button => {
        button.addEventListener('click', () => {
            abrirMenuCriacao(button.getAttribute('data-slot'));
        });
    });
});

