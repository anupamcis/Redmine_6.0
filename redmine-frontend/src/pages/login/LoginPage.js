import React, { useState } from 'react';
import { Mail, Lock, ChevronRight } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { loginRequest, loginSuccess, loginFailure } from '../../store/authSlice';
import { useNavigate } from 'react-router-dom';
import { login as adapterLogin } from '../../api/redmineAdapter';

function LoginPage(){
  const [username,setUsername] = useState('');
  const [password,setPassword] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    dispatch(loginRequest());
    try{
      const res = await adapterLogin({ username, password });
      dispatch(loginSuccess({ user: res.user, csrfToken: res.csrfToken }));
      navigate('/my_projects');
    }catch(err){
      dispatch(loginFailure(err.toString()))
      alert(`Login failed: ${err.message || err}`)
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      {/* soft gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-pink-100 via-purple-100 to-blue-100 opacity-80" />

      <div className="relative w-full max-w-md p-8 bg-white/95 backdrop-blur rounded-xl shadow-md border border-gray-100">
        {/* CIS Logo */}
        <div className="flex justify-center mb-6">
          <img src="/cis-logo.png" alt="CIS" className="h-10 object-contain" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Work email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={username}
                onChange={e=>setUsername(e.target.value)}
                className="w-full h-10 pl-9 pr-3 border rounded-md focusOutline"
                placeholder="name@company.com"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={e=>setPassword(e.target.value)}
                className="w-full h-10 pl-9 pr-3 border rounded-md focusOutline"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <a className="text-[var(--muted)] hover:underline" href="/forgot">Forgot Password?</a>
          </div>

          <button className="w-full h-10 rounded-md bg-[var(--primary)] text-white flex items-center justify-center gap-2">
            Log In
            <ChevronRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;


