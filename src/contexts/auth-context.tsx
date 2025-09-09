
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, AuthCredential, sendPasswordResetEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, db, storage, app as mainApp } from '@/lib/firebase';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, deleteDoc, writeBatch, or } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import type { UserProfile, Team, MatchState, Tournament } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { initializeApp, getApp, deleteApp } from 'firebase/app';
import { getAuth as getAuthInstance } from 'firebase/auth';


interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<any>;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signInWithPhoneAndPassword: (phoneNumber: string, password: string) => Promise<any>;
  sendPasswordReset: (emailOrPhone: string) => Promise<void>;
  createUserProfile: (uid: string, data: Omit<UserProfile, 'uid' | 'id'>) => Promise<void>;
  registerNewPlayer: (name: string, phoneNumber: string, email?: string) => Promise<UserProfile | null>;
  updateUserProfile: (uid: string, data: Partial<Omit<UserProfile, 'uid' | 'id'>>) => Promise<void>;
  uploadProfilePicture: (uid: string, file: File) => Promise<string>;
  uploadTeamLogo: (teamId: string, file: File) => Promise<string>;
  uploadTournamentImage: (tournamentId: string, file: File, type: 'logo' | 'cover') => Promise<string>;
  searchUsers: (searchTerm: string) => Promise<UserProfile[]>;
  searchTeams: (searchTerm: string) => Promise<Team[]>;
  globalSearch: (searchTerm: string) => Promise<{ players: UserProfile[], matches: MatchState[], tournaments: Tournament[] }>;
  resetDatabase: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        const usersRef = collection(db, 'users');
        // A user's profile is stored with their phone number as the document ID.
        // We can't query by UID directly anymore if we don't know the phone number.
        // We will try to find the user by their Auth email, which could be real or dummy.
        const q = query(usersRef, where("uid", "==", user.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            setUserProfile({ id: userDoc.id, uid: user.uid, ...userDoc.data() } as UserProfile);
        } else {
          // This case might happen if the profile hasn't been created yet or there's an inconsistency.
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
  
  const sendPasswordReset = async (emailOrPhone: string) => {
    const usersRef = collection(db, "users");
    const isEmail = emailOrPhone.includes('@');
    
    const q = isEmail 
        ? query(usersRef, where("email", "==", emailOrPhone))
        : query(usersRef, where("phoneNumber", "==", emailOrPhone));

    try {
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          console.log(`Password reset requested for non-existent user: ${emailOrPhone}`);
          // Don't throw an error to prevent account enumeration. We just don't do anything.
          return;
        }
        
        const userDoc = querySnapshot.docs[0].data() as UserProfile;
        
        // Determine the email to send the reset link to.
        // If the user has a real email, use that. Otherwise, use the dummy one.
        const emailForAuth = userDoc.email || `${userDoc.phoneNumber}@cricmate.com`;
        
        await sendPasswordResetEmail(auth, emailForAuth);
    } catch (error: any) {
        // We can swallow this error to avoid leaking information about which emails are registered.
        console.error("Firebase sendPasswordResetEmail error:", error.message);
    }
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

    // Use the actual email if it exists, otherwise construct the dummy email for auth
    const emailForAuth = userData.email || `${phoneNumber}@cricmate.com`;
    
    return signInWithEmailAndPassword(auth, emailForAuth, password);
  };

  const createUserProfile = async (uid: string, data: Omit<UserProfile, 'uid' | 'id'>) => {
    const docId = data.phoneNumber; // Use phone number as the document ID
    const userDocRef = doc(db, 'users', docId);

    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists() && docSnap.data().isPlaceholder) {
        // This is a placeholder profile, let's claim it by updating it with the new auth UID
        const profileData = { uid, ...data, isPlaceholder: false };
        await updateDoc(userDocRef, profileData);
        setUserProfile({ id: docId, ...profileData, uid });

    } else if(docSnap.exists() && !docSnap.data().isPlaceholder) {
        throw new Error("A user with this phone number already exists.");
    } else {
        // This is a brand new user
        const profileData = { uid, ...data, isPlaceholder: false };
        await setDoc(userDocRef, profileData);
        setUserProfile({ id: docId, ...profileData, uid });
    }
  };

    const registerNewPlayer = async (name: string, phoneNumber: string, email?: string): Promise<UserProfile | null> => {
    if (!user) {
      throw new Error("You must be logged in to register a new player.");
    }

    const userDocRef = doc(db, 'users', phoneNumber);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      throw new Error("A player with this phone number is already registered.");
    }

    // Initialize a temporary, secondary Firebase app for user creation
    const tempAppName = `temp-user-creation-${Date.now()}`;
    const tempApp = initializeApp(mainApp.options, tempAppName);
    const tempAuth = getAuthInstance(tempApp);

    try {
      const emailForAuth = email || `${phoneNumber}@cricmate.com`;
      const tempPassword = phoneNumber;

      const newUserCredential = await createUserWithEmailAndPassword(tempAuth, emailForAuth, tempPassword);
      const newAuthUser = newUserCredential.user;

      // Save the new user profile with their actual UID
      const profileData: Omit<UserProfile, 'id'> = {
        uid: newAuthUser.uid,
        name: name,
        phoneNumber: phoneNumber,
        email: email,
        gender: 'Other',
        isPlaceholder: false,
      };
      await setDoc(userDocRef, profileData);

      // Sign out the new user from the temporary app instance to clean up
      await signOut(tempAuth);

      toast({
        title: 'Player Created!',
        description: `${name} has been registered and can now log in with their phone number as password.`,
      });
      
      return { id: phoneNumber, ...profileData };

    } catch (error: any) {
      console.error("Error creating new player:", error);
      throw new Error(error.message || "Failed to create new player.");
    } finally {
      // Clean up the temporary Firebase app instance
      await deleteApp(tempApp);
    }
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
          if (userData.uid) usersMap.set(userData.uid, userData);
      });
      
      phoneSnapshot.forEach(doc => {
          const userData = { id: doc.id, ...doc.data() } as UserProfile;
          if (userData.uid) usersMap.set(userData.uid, userData);
      });

      return Array.from(usersMap.values());
  };

  const searchTeams = async (searchTerm: string): Promise<Team[]> => {
    const teamsRef = collection(db, "teams");
    const allTeamsSnapshot = await getDocs(teamsRef);
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
    const nameQuery = query(teamsRef, where('name', '>=', searchTerm), where('name', '<=', searchTerm + '\uf8ff'));
    const nameSnapshot = await getDocs(nameQuery);
    const teams: Team[] = [];
    nameSnapshot.forEach(doc => {
        teams.push({ id: doc.id, ...doc.data() } as Team);
    });
    return teams;
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

  const globalSearch = async (searchTerm: string): Promise<{ players: UserProfile[], matches: MatchState[], tournaments: Tournament[] }> => {
    const st = searchTerm.toLowerCase();
    
    // Players
    const players = await searchUsers(searchTerm);

    // Matches - very basic search on team names
    const matchesRef = collection(db, "matches");
    const matchQuery = query(matchesRef, or(
        where('config.team1.name', '>=', st), where('config.team1.name', '<=', st + '\uf8ff'),
        where('config.team2.name', '>=', st), where('config.team2.name', '<=', st + '\uf8ff')
    ));
    const matchSnap = await getDocs(matchesRef); // A more efficient way would be Algolia/Elasticsearch
    const matches = matchSnap.docs
        .map(doc => ({id: doc.id, ...doc.data()}) as MatchState)
        .filter(m => m.config.team1.name.toLowerCase().includes(st) || m.config.team2.name.toLowerCase().includes(st));


    // Tournaments
    const tourneyRef = collection(db, "tournaments");
    const tourneyQuery = query(tourneyRef, where('name', '>=', searchTerm), where('name', '<=', searchTerm + '\uf8ff'));
    const tourneySnap = await getDocs(tourneyQuery);
    const tournaments = tourneySnap.docs.map(doc => ({id: doc.id, ...doc.data()}) as Tournament);

    return { players, matches, tournaments };
  };

  const value = {
    user,
    userProfile,
    loading,
    logout,
    signUpWithEmail,
    signInWithEmail,
    signInWithPhoneAndPassword,
    sendPasswordReset,
    createUserProfile,
    registerNewPlayer,
    updateUserProfile,
    uploadProfilePicture,
    uploadTeamLogo,
    uploadTournamentImage,
    searchUsers,
    searchTeams,
    globalSearch,
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
