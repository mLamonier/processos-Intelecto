// Importações do Firebase. Elas funcionarão porque o index.html as carrega via CDN.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, getDocs, onSnapshot, updateDoc, deleteDoc, query, where, arrayUnion } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- CONFIGURAÇÃO DO FIREBASE ---
// IMPORTANTE: Substitua as informações abaixo pelas suas próprias credenciais do Firebase.
// Você pode obtê-las no console do seu projeto, em "Configurações do projeto" > "Geral" > "Seus aplicativos".
const firebaseConfig = {
  apiKey: "AIzaSyAbbZL_2S_Sw4Wx32zarT3ysVL7mXJbbAg",
  authDomain: "projeto-processos-f3bae.firebaseapp.com",
  projectId: "projeto-processos-f3bae",
  storageBucket: "projeto-processos-f3bae.appspot.com",
  messagingSenderId: "833877342179",
  appId: "1:833877342179:web:35aca996c3645589eb12d6"
};
const appId = 'processos-judiciais-app'; // Você pode manter este ou mudar se preferir.

// Variáveis globais da aplicação
let app, auth, db, userId;

// --- DADOS INICIAIS (do seu CSV) ---
// Estes dados serão usados para popular o banco de dados na primeira vez que um usuário acessar.
const initialData = [
    { nome: 'ALINE APARECIDA DE PAULA', valorInicial: 1109.81, numeroProcesso: '5002010-33.2023.8.13.0479', obs: '' },
    { nome: 'ANA CLARA ALVES', valorInicial: 1215.86, numeroProcesso: '5002498-85.2023.8.13.0479', obs: '' },
    { nome: 'CARLOS HENRIQUE DE OLIVEIRA', valorInicial: 763.53, numeroProcesso: '5002447-74.2023.8.13.0479', obs: '' },
    { nome: 'DANIELE VITORIA DA SILVA', valorInicial: 978.89, numeroProcesso: '5002496-18.2023.8.13.0479', obs: '' },
    { nome: 'ERICA APARECIDA DA SILVA', valorInicial: 1221.36, numeroProcesso: '5002008-63.2023.8.13.0479', obs: '' },
    { nome: 'GABRIEL JUNIOR DE LIMA', valorInicial: 894.13, numeroProcesso: '5002450-29.2023.8.13.0479', obs: '' },
    { nome: 'GABRIELLY CRISTINA DA SILVA', valorInicial: 1109.81, numeroProcesso: '5002009-48.2023.8.13.0479', obs: '' },
    { nome: 'ISABELA VITORIA DOS REIS', valorInicial: 1215.86, numeroProcesso: '5002495-33.2023.8.13.0479', obs: '' },
    { nome: 'IZABELLA CHAGAS', valorInicial: 1221.36, numeroProcesso: '5002012-03.2023.8.13.0479', obs: '' },
    { nome: 'KAUAN VITOR DA SILVA', valorInicial: 978.89, numeroProcesso: '5002500-55.2023.8.13.0479', obs: '' },
    { nome: 'LARA BEATRIZ SILVA', valorInicial: 1215.86, numeroProcesso: '5002499-70.2023.8.13.0479', obs: '' },
    { nome: 'LARISSA EVELYN DA SILVA', valorInicial: 1109.81, numeroProcesso: '5002011-18.2023.8.13.0479', obs: '' },
    { nome: 'LORENA SOFIA PEREIRA', valorInicial: 1215.86, numeroProcesso: '5002494-48.2023.8.13.0479', obs: '' },
    { nome: 'LUCIANA DA SILVA', valorInicial: 1040.66, numeroProcesso: '5002241-60.2023.8.13.0479', obs: '' },
    { nome: 'MARIA EDUARDA DE OLIVEIRA', valorInicial: 894.13, numeroProcesso: '5002449-44.2023.8.13.0479', obs: '' },
    { nome: 'MARIA LUIZA GOMES', valorInicial: 1040.66, numeroProcesso: '5002242-45.2023.8.13.0479', obs: '' },
    { nome: 'VANESSA DE CASSIA SILVA', valorInicial: 894.13, numeroProcesso: '5002448-59.2023.8.13.0479', obs: '' },
    { nome: 'WESLEY DE PAULA', valorInicial: 1221.36, numeroProcesso: '5002007-78.2023.8.13.0479', obs: '' }
];

// --- ELEMENTOS DO DOM ---
// Mapeia os elementos HTML para variáveis JavaScript para fácil acesso.
const ui = {
    loading: document.getElementById('loading'),
    processosTableContainer: document.getElementById('processosTableContainer'),
    processosTbody: document.getElementById('processosTbody'),
    searchInput: document.getElementById('searchInput'),
    noResults: document.getElementById('noResults'),
    userIdDisplay: document.getElementById('userIdDisplay'),
    addProcessoBtn: document.getElementById('addProcessoBtn'),
    processoModal: {
        backdrop: document.getElementById('processoModalBackdrop'),
        modal: document.getElementById('processoModal'),
        title: document.getElementById('processoModalTitle'),
        form: document.getElementById('processoForm'),
        id: document.getElementById('processoId'),
        nome: document.getElementById('nome'),
        numeroProcesso: document.getElementById('numeroProcesso'),
        valorInicial: document.getElementById('valorInicial'),
        obs: document.getElementById('obs'),
        closeBtn: document.getElementById('closeProcessoModal'),
    },
    pagamentoModal: {
        backdrop: document.getElementById('pagamentoModalBackdrop'),
        modal: document.getElementById('pagamentoModal'),
        nome: document.getElementById('pagamentoModalNome'),
        form: document.getElementById('pagamentoForm'),
        processoId: document.getElementById('pagamentoProcessoId'),
        valor: document.getElementById('pagamentoValor'),
        data: document.getElementById('pagamentoData'),
        descricao: document.getElementById('pagamentoDescricao'),
        list: document.getElementById('pagamentosList'),
        resumo: document.getElementById('pagamentosResumo'),
        closeBtn: document.getElementById('closePagamentoModal'),
    },
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
};

let allProcessos = []; // Cache local para armazenar os processos e facilitar a busca/filtragem.

// --- FUNÇÕES AUXILIARES ---

// Formata um número para o padrão de moeda brasileira (R$).
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// Formata uma string de data (AAAA-MM-DD) para o padrão brasileiro (DD/MM/AAAA).
const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00'); // Adiciona T00:00:00 para evitar problemas de fuso horário.
    return date.toLocaleDateString('pt-BR');
};

// Exibe uma notificação (toast) no canto da tela.
function showToast(message, isError = false) {
    ui.toastMessage.textContent = message;
    ui.toast.className = `fixed bottom-5 right-5 text-white py-2 px-4 rounded-lg shadow-lg transform transition-all duration-300 ${isError ? 'bg-red-500' : 'bg-green-600'} translate-y-0 opacity-100`;
    setTimeout(() => {
        ui.toast.className = ui.toast.className.replace('translate-y-0 opacity-100', 'translate-y-20 opacity-0');
    }, 3000);
}

// --- FUNÇÕES DE RENDERIZAÇÃO ---

// Desenha a tabela de processos na tela.
function renderTable(processos) {
    ui.processosTbody.innerHTML = '';
    ui.noResults.classList.toggle('hidden', processos.length > 0);
    
    processos.forEach(proc => {
        const totalPago = proc.pagamentos?.reduce((sum, p) => sum + p.valor, 0) || 0;
        const saldoDevedor = proc.valorInicial - totalPago;

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50';
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="font-medium text-gray-900">${proc.nome}</div>
                <div class="text-sm text-gray-500 md:hidden">${proc.numeroProcesso}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap hidden md:table-cell text-sm text-gray-500">${proc.numeroProcesso}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${formatCurrency(proc.valorInicial)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${saldoDevedor > 0 ? 'text-red-600' : 'text-green-600'}">${formatCurrency(saldoDevedor)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                <button data-id="${proc.id}" class="view-btn text-blue-600 hover:text-blue-900 mr-4" title="Ver Detalhes e Lançar Alvará"><i class="fas fa-money-check-dollar"></i></button>
                <button data-id="${proc.id}" class="edit-btn text-yellow-600 hover:text-yellow-900 mr-4" title="Editar Processo"><i class="fas fa-edit"></i></button>
                <button data-id="${proc.id}" class="delete-btn text-red-600 hover:text-red-900" title="Excluir Processo"><i class="fas fa-trash"></i></button>
            </td>
        `;
        ui.processosTbody.appendChild(tr);
    });
}
        
// Filtra os processos com base no campo de busca e chama a renderização.
function filterAndRender() {
    const searchTerm = ui.searchInput.value.toLowerCase();
    const filtered = allProcessos.filter(p => 
        p.nome.toLowerCase().includes(searchTerm) ||
        p.numeroProcesso.toLowerCase().includes(searchTerm)
    );
    renderTable(filtered);
}

// --- CONTROLES DE MODAL ---

// Abre o modal para adicionar ou editar um processo.
function openProcessoModal(processo = null) {
    ui.processoModal.form.reset();
    if (processo) {
        ui.processoModal.title.textContent = 'Editar Processo';
        ui.processoModal.id.value = processo.id;
        ui.processoModal.nome.value = processo.nome;
        ui.processoModal.numeroProcesso.value = processo.numeroProcesso;
        ui.processoModal.valorInicial.value = processo.valorInicial;
        ui.processoModal.obs.value = processo.obs;
    } else {
        ui.processoModal.title.textContent = 'Adicionar Novo Processo';
        ui.processoModal.id.value = '';
    }
    ui.processoModal.backdrop.style.display = 'block';
    ui.processoModal.modal.style.display = 'block';
}

function closeProcessoModal() {
    ui.processoModal.backdrop.style.display = 'none';
    ui.processoModal.modal.style.display = 'none';
}
        
// Abre o modal para ver detalhes e adicionar pagamentos (alvarás).
function openPagamentoModal(processo) {
    ui.pagamentoModal.form.reset();
    ui.pagamentoModal.processoId.value = processo.id;
    ui.pagamentoModal.nome.textContent = processo.nome;
    ui.pagamentoModal.data.value = new Date().toISOString().split('T')[0];

    renderPagamentos(processo);

    ui.pagamentoModal.backdrop.style.display = 'block';
    ui.pagamentoModal.modal.style.display = 'block';
}

function closePagamentoModal() {
    ui.pagamentoModal.backdrop.style.display = 'none';
    ui.pagamentoModal.modal.style.display = 'none';
}
        
// Renderiza a lista de pagamentos e o resumo financeiro dentro do modal de pagamentos.
function renderPagamentos(processo) {
    const pagamentos = processo.pagamentos || [];
    ui.pagamentoModal.list.innerHTML = '';

    if (pagamentos.length === 0) {
        ui.pagamentoModal.list.innerHTML = '<p class="text-gray-500 text-center italic">Nenhum alvará lançado.</p>';
    } else {
        // Ordena pagamentos por data, do mais recente para o mais antigo.
        pagamentos.sort((a, b) => new Date(b.data) - new Date(a.data));
        pagamentos.forEach(p => {
            const div = document.createElement('div');
            div.className = 'bg-white p-3 rounded-lg shadow-sm border border-gray-200';
            div.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="font-semibold text-green-700">${formatCurrency(p.valor)}</span>
                    <span class="text-sm text-gray-500">${formatDate(p.data)}</span>
                </div>
                ${p.descricao ? `<p class="text-sm text-gray-600 mt-1">${p.descricao}</p>` : ''}
            `;
            ui.pagamentoModal.list.appendChild(div);
        });
    }

    const totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);
    const saldoDevedor = processo.valorInicial - totalPago;

    ui.pagamentoModal.resumo.innerHTML = `
        <div class="flex justify-between text-sm">
            <span class="text-gray-600">Valor Original:</span>
            <span class="font-medium">${formatCurrency(processo.valorInicial)}</span>
        </div>
        <div class="flex justify-between text-sm mt-1">
            <span class="text-gray-600">Total Pago (Alvarás):</span>
            <span class="font-medium text-green-600">${formatCurrency(totalPago)}</span>
        </div>
        <div class="flex justify-between text-lg font-bold mt-2">
            <span>Saldo Devedor:</span>
            <span class="${saldoDevedor > 0 ? 'text-red-600' : 'text-green-600'}">${formatCurrency(saldoDevedor)}</span>
        </div>
    `;
}

// --- OPERAÇÕES COM O FIREBASE (BANCO DE DADOS) ---

// Salva um processo (cria um novo ou atualiza um existente).
async function saveProcesso(e) {
    e.preventDefault();
    const id = ui.processoModal.id.value;
    const data = {
        nome: ui.processoModal.nome.value,
        numeroProcesso: ui.processoModal.numeroProcesso.value,
        valorInicial: parseFloat(ui.processoModal.valorInicial.value),
        obs: ui.processoModal.obs.value,
        ownerId: userId // Garante que o processo pertence ao usuário logado.
    };

    try {
        if (id) { // Editando um processo existente.
            const processoRef = doc(db, `artifacts/${appId}/public/data/processos`, id);
            await updateDoc(processoRef, data);
            showToast('Processo atualizado com sucesso!');
        } else { // Criando um novo processo.
            await addDoc(collection(db, `artifacts/${appId}/public/data/processos`), {
                ...data,
                pagamentos: [] // Inicia com um array de pagamentos vazio.
            });
            showToast('Processo adicionado com sucesso!');
        }
        closeProcessoModal();
    } catch (error) {
        console.error("Erro ao salvar processo: ", error);
        showToast('Erro ao salvar processo.', true);
    }
}
        
// Exclui um processo do banco de dados.
async function deleteProcesso(id) {
    // Usamos um confirm para evitar exclusões acidentais.
    if (window.confirm('Tem certeza que deseja excluir este processo? Esta ação não pode ser desfeita.')) {
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/processos`, id));
            showToast('Processo excluído com sucesso!');
        } catch (error) {
            console.error("Erro ao excluir processo: ", error);
            showToast('Erro ao excluir processo.', true);
        }
    }
}

// Salva um novo pagamento (alvará) para um processo existente.
async function savePagamento(e) {
    e.preventDefault();
    const processoId = ui.pagamentoModal.processoId.value;
    const novoPagamento = {
        valor: parseFloat(ui.pagamentoModal.valor.value),
        data: ui.pagamentoModal.data.value,
        descricao: ui.pagamentoModal.descricao.value
    };

    if (!processoId || isNaN(novoPagamento.valor) || !novoPagamento.data) {
        showToast('Por favor, preencha o valor e a data.', true);
        return;
    }
    
    try {
        const processoRef = doc(db, `artifacts/${appId}/public/data/processos`, processoId);
        // 'arrayUnion' adiciona um novo item a um array sem duplicá-lo.
        await updateDoc(processoRef, {
            pagamentos: arrayUnion(novoPagamento)
        });
        showToast('Alvará lançado com sucesso!');
        
        // Atualiza o modal em tempo real com o novo pagamento.
        const processoAtualizado = allProcessos.find(p => p.id === processoId);
        if (processoAtualizado) {
            if (!processoAtualizado.pagamentos) processoAtualizado.pagamentos = [];
            processoAtualizado.pagamentos.push(novoPagamento);
            renderPagamentos(processoAtualizado);
        }
        
        ui.pagamentoModal.form.reset();
        ui.pagamentoModal.data.value = new Date().toISOString().split('T')[0];

    } catch (error) {
        console.error("Erro ao lançar pagamento: ", error);
        showToast('Erro ao lançar pagamento.', true);
    }
}

// Verifica se o banco de dados está vazio e, se estiver, popula com os dados iniciais.
async function seedInitialData() {
    const q = query(collection(db, `artifacts/${appId}/public/data/processos`), where("ownerId", "==", userId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        console.log("Banco de dados vazio para este usuário. Populando com dados iniciais...");
        showToast("Criando base de dados inicial para você...");
        for (const item of initialData) {
            await addDoc(collection(db, `artifacts/${appId}/public/data/processos`), {
                ...item,
                ownerId: userId,
                pagamentos: []
            });
        }
    } else {
         console.log("Dados já existem para este usuário.");
    }
}

// --- INICIALIZAÇÃO E EVENT LISTENERS ---

// Função principal que orquestra a inicialização da aplicação.
async function main() {
    // Verifica se a configuração do Firebase foi preenchida.
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "SUA_API_KEY_AQUI") {
         ui.loading.innerHTML = '<p class="text-red-500 font-semibold">Erro: A configuração do Firebase está faltando no arquivo main.js. Por favor, adicione suas credenciais para que a aplicação possa funcionar.</p>';
        return;
    }
    
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Observa mudanças no estado de autenticação.
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;
            ui.userIdDisplay.textContent = userId;
            
            // Popula o banco com dados iniciais, se necessário.
            await seedInitialData();

            // Listener em tempo real: qualquer mudança no banco de dados para este usuário
            // irá disparar esta função e atualizar a tela.
            const q = query(collection(db, `artifacts/${appId}/public/data/processos`), where("ownerId", "==", userId));
            onSnapshot(q, (querySnapshot) => {
                allProcessos = [];
                querySnapshot.forEach((doc) => {
                    allProcessos.push({ id: doc.id, ...doc.data() });
                });
                
                // Ordena os processos por nome.
                allProcessos.sort((a,b) => a.nome.localeCompare(b.nome));

                filterAndRender();
                
                ui.loading.style.display = 'none';
                ui.processosTableContainer.classList.remove('hidden');

            }, (error) => {
                console.error("Erro ao buscar dados: ", error);
                ui.loading.innerHTML = '<p class="text-red-500">Erro ao carregar dados. Verifique o console.</p>';
            });

        }
    });
    
    // Faz login anônimo para que cada usuário tenha um ID único.
    await signInAnonymously(auth).catch((error) => {
        console.error("Erro ao fazer login anônimo:", error);
        ui.loading.innerHTML = '<p class="text-red-500">Erro de autenticação. A aplicação não pode funcionar.</p>';
    });
}

// --- CONFIGURAÇÃO DOS EVENTOS DE CLIQUE E INTERAÇÃO ---

// Botões para abrir os modais
ui.addProcessoBtn.addEventListener('click', () => openProcessoModal());

// Eventos para fechar o modal de processo
ui.processoModal.closeBtn.addEventListener('click', closeProcessoModal);
ui.processoModal.backdrop.addEventListener('click', closeProcessoModal);

// Submissão do formulário de processo
ui.processoModal.form.addEventListener('submit', saveProcesso);

// Eventos para fechar o modal de pagamento
ui.pagamentoModal.closeBtn.addEventListener('click', closePagamentoModal);
ui.pagamentoModal.backdrop.addEventListener('click', closePagamentoModal);

// Submissão do formulário de pagamento
ui.pagamentoModal.form.addEventListener('submit', savePagamento);

// Filtro de busca
ui.searchInput.addEventListener('input', filterAndRender);

// Copiar ID do usuário para a área de transferência
ui.userIdDisplay.addEventListener('click', () => {
    if(!userId) return;
    navigator.clipboard.writeText(userId).then(() => {
        showToast('ID do usuário copiado!');
    }).catch(err => {
        showToast('Erro ao copiar ID.', true);
    });
});

// Delegação de eventos para os botões na tabela (ver, editar, excluir)
ui.processosTbody.addEventListener('click', e => {
    const target = e.target.closest('button');
    if (!target) return;

    const id = target.dataset.id;
    const processo = allProcessos.find(p => p.id === id);
    
    if (target.classList.contains('edit-btn')) {
        openProcessoModal(processo);
    } else if (target.classList.contains('delete-btn')) {
        deleteProcesso(id);
    } else if (target.classList.contains('view-btn')) {
        openPagamentoModal(processo);
    }
});

// Inicia a aplicação
main();
