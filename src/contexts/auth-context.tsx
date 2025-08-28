
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, AuthCredential } from 'firebase/auth';
import { auth, db, storage } from '@/lib/firebase';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
  signInWithPhoneAndPassword: (phoneNumber: string, password: string) => Promise<any>;
  createUserProfile: (uid: string, data: Omit<UserProfile, 'uid'>) => Promise<void>;
  updateUserProfile: (uid: string, data: Partial<Omit<UserProfile, 'uid'>>) => Promise<void>;
  uploadProfilePicture: (uid: string, file: File) => Promise<string>;
  uploadTournamentImage: (tournamentId: string, file: File, type: 'logo' | 'cover') => Promise<string>;
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
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("uid", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          setUserProfile(userDoc.data() as UserProfile);
        } else {
          // Profile not created yet or data inconsistency
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

  const signInWithPhoneAndPassword = async (phoneNumber: string, password: string) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("phoneNumber", "==", phoneNumber));
    
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        throw new Error("No user found with this phone number.");
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data() as UserProfile;

    if (!userData.email) {
        // This case handles users who registered with phone only (and have a dummy email)
        const dummyEmail = `${phoneNumber}@cricmate.com`;
        return signInWithEmailAndPassword(auth, dummyEmail, password);
    }
    
    return signInWithEmailAndPassword(auth, userData.email, password);
  };

  const createUserProfile = async (uid: string, data: Omit<UserProfile, 'uid'>) => {
    // Use phone number as the document ID
    await setDoc(doc(db, 'users', data.phoneNumber), { uid, ...data });
    setUserProfile({ uid, ...data });
  };
  
  const updateUserProfile = async (uid: string, data: Partial<Omit<UserProfile, 'uid'>>) => {
    // Find user doc by UID to update it, as phone number (doc ID) might change.
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("uid", "==", uid));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const userDocRef = querySnapshot.docs[0].ref;
        await updateDoc(userDocRef, data);
        setUserProfile(prev => prev ? { ...prev, ...data } : null);
    } else {
        throw new Error("User profile not found for update.");
    }
  };

  const uploadProfilePicture = async (uid: string, file: File) => {
    const storageRef = ref(storage, `profile-pictures/${uid}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  };
  
  const uploadTournamentImage = async (tournamentId: string, file: File, type: 'logo' | 'cover') => {
    const storageRef = ref(storage, `tournaments/${tournamentId}/${type}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  }

  const value = {
    user,
    userProfile,
    loading,
    logout,
    signUpWithEmail,
    signInWithEmail,
    signInWithPhoneAndPassword,
    createUserProfile,
    updateUserProfile,
    uploadProfilePicture,
    uploadTournamentImage
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
