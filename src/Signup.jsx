import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase"; //
import { useNavigate } from "react-router-dom";

// Signup component ke andar ye function hoga
const handleSignup = async (e) => {
  e.preventDefault();
  try {
    // 1. Firebase Auth mein account banana
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. IMPORTANT CHANGE: Auth profile mein user ka naam set karna
    // Isse Chat header mein 'Aryan' dikhega
    await updateProfile(user, { displayName: name });

    // 3. Firestore Database mein user data save karna
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      displayName: name,
      email: email,
      createdAt: serverTimestamp(),
    });

    console.log("Profile Updated Successfully!");
    navigate("/chat"); // Seedha dashboard par
  } catch (error) {
    console.error("Signup Error:", error.message);
    alert(error.message);
  }
};