
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, AuthCredential, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth, db, storage } from '@/lib/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<any>;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  setupRecaptcha: (elementId: string) => RecaptchaVerifier;
  signInWithPhone: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  confirmPhoneSignIn: (confirmationResult: ConfirmationResult, code: string) => Promise<any>;
  createUserProfile: (uid: string, data: Omit<UserProfile, 'uid'>) => Promise<void>;
  updateUserProfile: (uid: string, data: Partial<Omit<UserProfile, 'uid'>>) => Promise<void>;
  uploadProfilePicture: (uid: string, file: File) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        // Fetch user profile from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        } else {
          // Profile not created yet
          setUserProfile(null);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    router.push('/login');
  };
  
  const signUpWithEmail = (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const signInWithEmail = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const setupRecaptcha = (elementId: string) => {
    return new RecaptchaVerifier(auth, elementId, {
      'size': 'invisible',
    });
  };

  const signInWithPhone = (phoneNumber: string, appVerifier: RecaptchaVerifier) => {
      return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  };
  
  const confirmPhoneSignIn = (confirmationResult: ConfirmationResult, code: string) => {
    return confirmationResult.confirm(code);
  };

  const createUserProfile = async (uid: string, data: Omit<UserProfile, 'uid'>) => {
    await setDoc(doc(db, 'users', uid), { uid, ...data });
    setUserProfile({ uid, ...data });
  };
  
  const updateUserProfile = async (uid: string, data: Partial<Omit<UserProfile, 'uid'>>) => {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, data);
    setUserProfile(prev => prev ? { ...prev, ...data } : null);
  };

  const uploadProfilePicture = async (uid: string, file: File) => {
    const storageRef = ref(storage, `profile-pictures/${uid}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  };

  const value = {
    user,
    userProfile,
    loading,
    logout,
    signUpWithEmail,
    signInWithEmail,
    setupRecaptcha,
    signInWithPhone,
    confirmPhoneSignIn,
    createUserProfile,
    updateUserProfile,
    uploadProfilePicture,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
