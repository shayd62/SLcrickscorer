
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, AuthCredential } from 'firebase/auth';
import { auth, db, storage } from '@/lib/firebase';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import type { UserProfile, Team } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<any>;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signInWithPhoneAndPassword: (phoneNumber: string, password: string) => Promise<any>;
  createUserProfile: (uid: string, data: Omit<UserProfile, 'uid' | 'id'>) => Promise<void>;
  registerNewPlayer: (name: string, phoneNumber: string) => Promise<UserProfile>;
  updateUserProfile: (uid: string, data: Partial<Omit<UserProfile, 'uid' | 'id'>>) => Promise<void>;
  uploadProfilePicture: (uid: string, file: File) => Promise<string>;
  uploadTeamLogo: (teamId: string, file: File) => Promise<string>;
  uploadTournamentImage: (tournamentId: string, file: File, type: 'logo' | 'cover') => Promise<string>;
  searchUsers: (searchTerm: string) => Promise<UserProfile[]>;
  searchTeams: (searchTerm: string) => Promise<Team[]>;
  resetDatabase: () => Promise<void>;
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
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("uid", "==", user.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            setUserProfile({ id: userDoc.id, uid: user.uid, ...userDoc.data() } as UserProfile);
        } else {
          // Fallback for older data structure, can be removed later
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserProfile({ id: userDoc.id, uid: user.uid, ...userDoc.data() } as UserProfile);
          } else {
            setUserProfile(null);
          }
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

  const createUserProfile = async (uid: string, data: Omit<UserProfile, 'uid' | 'id'>) => {
    // Use phone number as the document ID to enforce uniqueness
    const docId = data.phoneNumber;
    const userDocRef = doc(db, 'users', docId);

    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
        throw new Error("A user with this phone number already exists.");
    }

    const profileData = { uid, ...data };
    await setDoc(userDocRef, profileData);
    setUserProfile({ id: docId, ...profileData, uid });
  };

  const registerNewPlayer = async (name: string, phoneNumber: string): Promise<UserProfile> => {
    // Check if player already exists by phone number (which is the document ID)
    const userDocRef = doc(db, 'users', phoneNumber);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
        throw new Error("A player with this phone number is already registered.");
    }

    const dummyEmail = `${phoneNumber}@cricmate.com`;
    const defaultPassword = 'password123'; // Or any default password logic

    const userCredential = await createUserWithEmailAndPassword(auth, dummyEmail, defaultPassword);
    const user = userCredential.user;

    const profileData: Omit<UserProfile, 'id'> = {
        uid: user.uid,
        name: name,
        phoneNumber: phoneNumber,
        gender: 'Other', // Default value
    };
    
    await setDoc(userDocRef, profileData);

    const newUserProfile: UserProfile = {
        id: phoneNumber,
        ...profileData
    };

    return newUserProfile;
};
  
  const updateUserProfile = async (uid: string, data: Partial<Omit<UserProfile, 'uid' | 'id'>>) => {
    if (!userProfile?.id) {
        throw new Error("No user profile found to update.");
    }
    const userDocRef = doc(db, 'users', userProfile.id);
    await updateDoc(userDocRef, data);
    setUserProfile(prev => prev ? { ...prev, ...data } : null);
  };

  const uploadProfilePicture = async (uid: string, file: File) => {
    const storageRef = ref(storage, `profile-pictures/${uid}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    await updateUserProfile(uid, { photoURL: downloadURL });
    return downloadURL;
  };

  const uploadTeamLogo = async (teamId: string, file: File) => {
    const storageRef = ref(storage, `team-logos/${teamId}`);
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

  const searchUsers = async (searchTerm: string): Promise<UserProfile[]> => {
      const usersRef = collection(db, 'users');
      const nameQuery = query(usersRef, where('name', '>=', searchTerm), where('name', '<=', searchTerm + '\uf8ff'));
      const phoneQuery = query(usersRef, where('phoneNumber', '>=', searchTerm), where('phoneNumber', '<=', searchTerm + '\uf8ff'));

      const [nameSnapshot, phoneSnapshot] = await Promise.all([
          getDocs(nameQuery),
          getDocs(phoneQuery),
      ]);
      
      const usersMap = new Map<string, UserProfile>();
      
      nameSnapshot.forEach(doc => {
          const userData = { id: doc.id, ...doc.data()} as UserProfile;
          usersMap.set(userData.uid, userData);
      });
      
      phoneSnapshot.forEach(doc => {
          const userData = { id: doc.id, ...doc.data() } as UserProfile;
          usersMap.set(userData.uid, userData);
      });

      return Array.from(usersMap.values());
  };

  const searchTeams = async (searchTerm: string): Promise<Team[]> => {
    if (!user) return [];
    
    const teamsRef = collection(db, "teams");
    const q = query(teamsRef, where("userId", "==", user.uid));
    const allTeamsSnapshot = await getDocs(q);
    const allTeams = allTeamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));

    // Check if searchTerm is a 4-digit PIN
    if (/^\d{4}$/.test(searchTerm)) {
        const pinToFind = parseInt(searchTerm, 10);
        
        for (const team of allTeams) {
            let hash = 0;
            for (let i = 0; i < team.id.length; i++) {
                const char = team.id.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash |= 0;
            }
            const generatedPin = (Math.abs(hash) % 10000);
            if (generatedPin === pinToFind) {
                return [team]; // Return the found team in an array
            }
        }
        return []; // No team found for this PIN
    }

    // Otherwise, search by name
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return allTeams.filter(team => team.name.toLowerCase().includes(lowercasedSearchTerm));
  };
  
   const resetDatabase = async () => {
    const collectionsToDelete = ['matches', 'teams', 'tournaments'];
    for (const collectionName of collectionsToDelete) {
      const q = query(collection(db, collectionName));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    logout,
    signUpWithEmail,
    signInWithEmail,
    signInWithPhoneAndPassword,
    createUserProfile,
    registerNewPlayer,
    updateUserProfile,
    uploadProfilePicture,
    uploadTeamLogo,
    uploadTournamentImage,
    searchUsers,
    searchTeams,
    resetDatabase,
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
