export const firebaseConfig = {
  apiKey: 'AIzaSyBDsWXeOPT2kkyS_I7mXn81W92lkEvfq2c',
  authDomain: 'keiba-fes-260525.firebaseapp.com',
  projectId: 'keiba-fes-260525',
  storageBucket: 'keiba-fes-260525.firebasestorage.app',
  messagingSenderId: '22507351706',
  appId: '1:22507351706:web:468f058a20b4c527c8f923'
};

export function hasFirebaseConfig() {
  return !Object.values(firebaseConfig).some((value) => String(value).startsWith('__'));
}
