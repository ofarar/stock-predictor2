import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const EditProfilePage = () => {
    const [formData, setFormData] = useState({ 
        username: '', 
        about: '', 
        youtubeLink: '', 
        xLink: '' 
    });
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch current user data to pre-fill the form
        axios.get('http://localhost:5001/auth/current_user', { withCredentials: true })
            .then(res => {
                if (res.data) {
                    setUser(res.data);
                    setFormData({
                        username: res.data.username || '',
                        about: res.data.about || '',
                        youtubeLink: res.data.youtubeLink || '',
                        xLink: res.data.xLink || ''
                    });
                } else {
                    navigate('/login'); // Redirect if not logged in
                }
            });
    }, [navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        axios.put('http://localhost:5001/api/profile', formData, { withCredentials: true })
            .then(res => {
                alert('Profile updated successfully!');
                // Redirect to the user's public profile page after saving
                navigate(`/profile/${user._id}`); 
            })
            .catch(err => {
                console.error("Profile update error:", err);
                alert('Failed to update profile.');
            });
    };

    return (
        <div className="max-w-2xl mx-auto bg-gray-800 p-8 rounded-lg animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-6">Edit Your Profile</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-300">Username</label>
                    <input type="text" name="username" id="username" value={formData.username} onChange={handleChange}
                        className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                    <label htmlFor="about" className="block text-sm font-medium text-gray-300">About</label>
                    <textarea name="about" id="about" rows="4" value={formData.about} onChange={handleChange}
                        className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"></textarea>
                </div>
                
                <div>
                    <label htmlFor="xLink" className="block text-sm font-medium text-gray-300">X (Twitter) Link</label>
                    <input type="url" name="xLink" id="xLink" placeholder="https://x.com/yourprofile" value={formData.xLink} onChange={handleChange}
                        className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                    <label htmlFor="youtubeLink" className="block text-sm font-medium text-gray-300">YouTube Link</label>
                    <input type="url" name="youtubeLink" id="youtubeLink" placeholder="https://youtube.com/yourchannel" value={formData.youtubeLink} onChange={handleChange}
                        className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>

                <button type="submit" className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-md hover:bg-green-600 transition duration-300">
                    Save Changes
                </button>
            </form>
        </div>
    );
};

export default EditProfilePage;