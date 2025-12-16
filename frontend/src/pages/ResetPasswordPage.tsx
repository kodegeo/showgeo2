import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then((res) => {
      console.log("RESET SESSION:", res);
    });
  }, []);

  const handleReset = async () => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) alert(error.message);
    else setDone(true);
  };

  return (
    <div>
      <h1>Reset Password</h1>

      <input
        type="password"
        placeholder="New password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleReset}>Update Password</button>

      {done && <p>Password updated! You may log in.</p>}
    </div>
  );
}
