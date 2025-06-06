// Inicialização do Firebase usando a CDN (window.firebase)
const firebaseConfig = {
  apiKey: "AIzaSyAbbZL_2S_Sw4Wx32zarT3ysVL7mXJbbAg",
  authDomain: "projeto-processos-f3bae.firebaseapp.com",
  projectId: "projeto-processos-f3bae",
  storageBucket: "projeto-processos-f3bae.appspot.com",
  messagingSenderId: "833877342179",
  appId: "1:833877342179:web:35aca996c3645589eb12d6"
};

// Inicializa o Firebase (usando a CDN)
if (window.firebase && window.firebase.initializeApp) {
  window.firebase.initializeApp(firebaseConfig);
}

// Aguarda o carregamento do Firebase Firestore via CDN
function waitForFirestore(callback) {
  if (window.firebase && window.firebase.firestore) {
    callback();
  } else {
    setTimeout(() => waitForFirestore(callback), 100);
  }
}

waitForFirestore(() => {
  const db = window.firebase.firestore();
  const processosTbody = document.getElementById('processosTbody');
  const loadingDiv = document.getElementById('loading');
  const processosTableContainer = document.getElementById('processosTableContainer');
  const noResultsDiv = document.getElementById('noResults');

  function renderProcessos(snapshot) {
    processosTbody.innerHTML = '';
    if (snapshot.empty) {
      processosTableContainer.classList.add('hidden');
      noResultsDiv.classList.remove('hidden');
      loadingDiv.classList.add('hidden');
      return;
    }
    snapshot.forEach(doc => {
      const processo = doc.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">${processo.nome || ''}</td>
        <td class="px-6 py-4 whitespace-nowrap hidden md:table-cell">${processo.numeroProcesso || ''}</td>
        <td class="px-6 py-4 whitespace-nowrap">R$ ${processo.valorInicial ? processo.valorInicial.toFixed(2) : ''}</td>
        <td class="px-6 py-4 whitespace-nowrap">R$ ${processo.saldoDevedor ? processo.saldoDevedor.toFixed(2) : ''}</td>
        <td class="px-6 py-4 whitespace-nowrap text-center">-</td>
      `;
      processosTbody.appendChild(tr);
    });
    processosTableContainer.classList.remove('hidden');
    noResultsDiv.classList.add('hidden');
    loadingDiv.classList.add('hidden');
  }

  db.collection('processos').onSnapshot(renderProcessos, (error) => {
    loadingDiv.classList.add('hidden');
    noResultsDiv.classList.remove('hidden');
    noResultsDiv.innerHTML = '<p class="text-red-500">Erro ao carregar dados.</p>';
  });
});