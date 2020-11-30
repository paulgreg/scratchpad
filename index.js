const title = document.querySelector('h1 input')
const textarea = document.querySelector('textarea')
const savingIcon = document.querySelector('#saving')
const addBtn = document.querySelector('#add')
const changeBtn = document.querySelector('#change')
const list = document.querySelector('#list ol')
const removeIcon = document.querySelector('#removeIcon').innerHTML
const storeLocallyButton = document.querySelector('#storeLocallyButton')
const auth = document.querySelector('#auth')

// Firebase
let firebaseUserUID = undefined
let firebaseDb = undefined

firebase.initializeApp({
  apiKey: 'AIzaSyDwOBJ1plRfSIe1vzAIt2CHMEuQeA46UYo',
  authDomain: 'scratchpad-678b6.firebaseapp.com',
  databaseURL: 'https://scratchpad-678b6.firebaseio.com',
  projectId: 'scratchpad-678b6',
  storageBucket: 'scratchpad-678b6.appspot.com',
  messagingSenderId: '963940996206',
  appId: '1:963940996206:web:7a6a4716e6a7ea78fc027f',
})

const firebaseAuth = firebase.auth()
const firebaseUi = new firebaseui.auth.AuthUI(firebaseAuth)
firebaseUi.start('#firebaseui-auth', {
  callbacks: {
    signInSuccessWithAuthResult: function (authResult, redirectUrl) {
      firebaseUserUID = authResult.user.uid
      firebaseDb = firebase.database()
      console.log('SignIn success !', 'uid', firebaseUserUID, 'db', firebaseDb)
      hideIntroAndLoad()
      return false
    },
  },
  signInOptions: [
    firebase.auth.GoogleAuthProvider.PROVIDER_ID,
    {
      provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
      requireDisplayName: false,
    },
  ],
  credentialHelper: firebaseui.auth.CredentialHelper.GOOGLE_YOLO,
})
// End firebase configuration

let lastTimeout
function debounce(fn, delay) {
  return () => {
    clearTimeout(lastTimeout)
    lastTimeout = setTimeout(fn, delay)
  }
}

function save() {
  data.items[data.lastIdx] = {
    title: title.value,
    text: textarea.value,
  }
  if (firebaseUserUID && firebaseDb) persistToFirebase()
  persistToLocalStorage() // Always save to localStorage
  setSaveIcon()
}

function persistToLocalStorage() {
  console.log('persistToLocalStorage', data)
  localStorage.setItem('data', JSON.stringify(data))
}

function persistToFirebase() {
  console.log('persistToFirebase', data)
  firebase.database().ref(`/scratchpad/${firebaseUserUID}`).set(data)
}

let timeoutSaveIcon
function setSaveIcon() {
  savingIcon.classList.add('saved')
  timeoutSaveIcon = setTimeout(() => savingIcon.classList.remove('saved'), 500)
}

const debouncedSave = debounce(save, 500)
textarea.addEventListener('keyup', debouncedSave, false)
textarea.addEventListener('paste', debouncedSave, false)
title.addEventListener('keyup', debouncedSave, false)
title.addEventListener('paste', debouncedSave, false)

let data = {
  lastIdx: 0,
  items: [
    {
      title: 'Scratchpad',
      text: `

Type your wonderful idea or grocery list here.`,
    },
  ],
}

function setContent(idx) {
  data.lastIdx = idx
  title.value = data.items[data.lastIdx].title
  textarea.value = data.items[data.lastIdx].text
  hideList()
  textarea.focus()
}

function retrieveFromLocalStorage() {
  const content = JSON.parse(localStorage.getItem('data'))
  console.log('retrieveFromLocalStorage', content)
  return Promise.resolve(content)
}

function retrieveFromFirebase() {
  return firebase
    .database()
    .ref(`/scratchpad/${firebaseUserUID}`)
    .once('value')
    .then((snapshot) => {
      const content = snapshot.val()
      console.log('retrieveFromFirebase', content)
      return content
    })
}

function watchFromFirebase(cb) {
  if (firebaseUserUID && firebaseDb) {
    firebase
      .database()
      .ref(`/scratchpad/${firebaseUserUID}`)
      .on('value', (snapshot) => {
        const d = snapshot.val()
        console.log('watchFromFirebase', d)
        if (d) cb(d)
      })
  }
}

function load() {
  ;(firebaseUserUID && firebaseDb
    ? retrieveFromFirebase()
    : retrieveFromLocalStorage()
  ).then((savedData) => {
    if (savedData && savedData.items) data = savedData
    setContent(data.lastIdx)
  })
  watchFromFirebase((newData) => {
    data = newData
    setContent(data.lastIdx)
  })
}

function addNewItem() {
  const newIdx = data.items.length
  data.items.push({ title: 'New note', text: '' })
  data.lastIdx = newIdx
  setContent(newIdx)
  save()
}

addBtn.addEventListener('click', addNewItem, false)

function removeItem(idx) {
  const title = data.items[idx].title
  const sure = confirm(`Are you sure to delete « ${title} » ?`)
  if (sure) {
    console.log('before', JSON.stringify(data.items))
    data.items.splice(idx, 1)
    console.log('after', JSON.stringify(data.items))
    data.lastIdx = 0
    persistToLocalStorage()
    buildList()
  }
}
function hideList() {
  document.body.classList.remove('list')
  emptyList()
}
function emptyList() {
  while (list.firstChild) {
    list.removeChild(list.firstChild)
  }
}
function buildList() {
  emptyList()
  const addRemoveBtn = data.items.length > 1
  data.items.forEach(({ title, text }, idx) => {
    const li = document.createElement('li')
    const aItem = document.createElement('a')
    aItem.innerText = title
    aItem.addEventListener('click', () => {
      setContent(idx)
    })
    const span = document.createElement('span')
    span.innerText = text.length ? `(${text.length} chars)` : '(empty)'
    li.appendChild(aItem)
    li.appendChild(span)
    if (addRemoveBtn) {
      const aRemove = document.createElement('a')
      aRemove.innerHTML = removeIcon
      aRemove.classList.add('remove')
      aRemove.addEventListener('click', () => {
        removeItem(idx)
      })
      li.appendChild(aRemove)
    }
    list.appendChild(li)
  })
  document.body.classList.add('list')
}
function toggleList() {
  document.body.classList.contains('list') ? hideList() : buildList()
}
changeBtn.addEventListener('click', toggleList, false)

const hideIntroAndLoad = () => {
  auth.style.display = 'none'
  load()
}
storeLocallyButton.addEventListener(
  'click',
  (e) => {
    e.preventDefault()
    hideIntroAndLoad()
  },
  false
)
