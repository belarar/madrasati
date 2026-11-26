import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  Firestore,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: 'AIzaSyC7e3AIENhc7a6TBDGdxH_69rJI1g0SGLA',
  authDomain: 'madrasati-app-d6da2.firebaseapp.com',
  projectId: 'madrasati-app-d6da2',
  storageBucket: 'madrasati-app-d6da2.firebasestorage.app',
  messagingSenderId: '81360797079',
  appId: '1:81360797079:web:f85b5d4a7e3ceb3b1458d2',
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

function createFirestore(): Firestore {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
      ignoreUndefinedProperties: true,
    });
  } catch {
    try {
      return initializeFirestore(app, {
        localCache: persistentLocalCache(),
        ignoreUndefinedProperties: true,
      });
    } catch {
      try {
        return initializeFirestore(app, {
          localCache: memoryLocalCache(),
          ignoreUndefinedProperties: true,
        });
      } catch {
        return getFirestore(app);
      }
    }
  }
}

export const firestore: Firestore = createFirestore();
export const db: Firestore = firestore;
