
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getTeamOverview, getAvailableUsers, addExistingMembers, createTeam, updateTeamMembers, deleteTeam, getTeamMessages, sendTeamMessage, markMessagesAsRead } from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Users2, MessageCircle, Send, Clock, CheckCircle2, Loader } from 'lucide-react';
import './TeamPage.css';

// Add Existing Member Modal
const AddExistingMemberModal = ({ setShowModal, setUnassigned, currentIds }) => {
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [options, setOptions] = useState([]);
    const [selected, setSelected] = useState([]);

    useEffect(() => {
        getAvailableUsers(currentIds)
            .then(res => setOptions(res.data || []))
            .catch(() => setError('Failed to load users.'))
            .finally(() => setIsLoading(false));
    }, [currentIds]);

    const onChange = (e) => {
        const values = Array.from(e.target.selectedOptions, o => o.value);
        setSelected(values);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selected.length === 0) return;
        const res = await addExistingMembers(selected);
        const data = res?.data;
        if (data?.success) {
            // Merge into unassigned list (these users are not in any team yet)
            setUnassigned(prev => {
                const map = new Map(prev.map(u => [u._id, u]));
                (data.users || []).forEach(u => map.set(u._id, u));
                return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name));
            });
            setShowModal(false);
        } else {
            setError(data?.error || 'Failed to add selected members.');
        }
    };

    return (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add Existing Member</h2>
                    <button onClick={() => setShowModal(false)} className="close-button"><X size={24}/></button>
                </div>
                <form onSubmit={handleSubmit}>
                    {isLoading ? (
                        <div style={{ color: '#A3AED0' }}>Loading users...</div>
                    ) : options.length === 0 ? (
                        <div style={{ color: '#A3AED0' }}>No users available to add.</div>
                    ) : (
                        <select name="users" multiple size={8} onChange={onChange}>
                            {options.map(u => (
                                <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                            ))}
                        </select>
                    )}
                    {error && <p className="error-message">{error}</p>}
                    <button type="submit" className="btn-primary" disabled={selected.length === 0}>Add Selected</button>
                </form>
            </div>
        </div>
    );
};

// Create Team Modal
const CreateTeamModal = ({ setShowModal, selectedIds, onCreated }) => {
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Please provide a team name.');
            return;
        }
        setIsSubmitting(true);
        const res = await createTeam({ name: name.trim(), memberIds: Array.from(selectedIds) });
        setIsSubmitting(false);
        if (res.data?.success) {
            onCreated(res.data.team);
            setShowModal(false);
        } else {
            setError(res.data?.error || 'Failed to create team.');
        }
    };

    return (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create New Team</h2>
                    <button onClick={() => setShowModal(false)} className="close-button"><X size={24}/></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <input name="teamName" placeholder="e.g., Alpha Squad" value={name} onChange={e => setName(e.target.value)} required />
                    {error && <p className="error-message">{error}</p>}
                    <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Team'}</button>
                </form>
            </div>
        </div>
    );
};

// Team Chat Component with Encryption & Compression
const TeamChat = ({ teams, currentUser }) => {
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const chatInterval = useRef(null);

    // Scroll to bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Load messages for selected team
    const loadMessages = async (teamId, silent = false) => {
        if (!silent) setIsLoading(true);
        setError(null);
        
        try {
            console.log('🔄 Loading messages for team:', teamId);
            const response = await getTeamMessages(teamId, { limit: 50 });
            console.log('📨 Messages response:', response);
            
            if (response?.data?.success) {
                const messages = response.data.messages || [];
                console.log(`✅ Loaded ${messages.length} messages`);
                setMessages(messages);
                setTimeout(scrollToBottom, 100);
                
                // Mark unread messages as read
                const unreadIds = messages
                    .filter(msg => 
                        msg.userId?._id !== currentUser?._id && 
                        !msg.readBy?.includes(currentUser?._id)
                    )
                    .map(msg => msg._id);
                
                if (unreadIds.length > 0) {
                    await markMessagesAsRead(teamId, unreadIds).catch(err => 
                        console.error('Failed to mark as read:', err)
                    );
                }
            } else {
                console.warn('❌ Unexpected response format:', response);
                setError(response?.data?.error || 'Failed to load messages');
            }
        } catch (err) {
            console.error('❌ Failed to load messages:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to load messages. Please try again.';
            setError(errorMsg);
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    // Auto-refresh messages every 5 seconds
    useEffect(() => {
        if (selectedTeam) {
            loadMessages(selectedTeam._id);
            
            // Set up polling
            chatInterval.current = setInterval(() => {
                loadMessages(selectedTeam._id, true); // Silent refresh
            }, 5000);
        }
        
        return () => {
            if (chatInterval.current) {
                clearInterval(chatInterval.current);
            }
        };
    }, [selectedTeam]);

    // Send message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedTeam || isSending) return;

        const messageText = newMessage.trim();
        setIsSending(true);
        setError(null);

        try {
            console.log('📤 Sending message:', messageText.substring(0, 20) + '...');
            const response = await sendTeamMessage(selectedTeam._id, { 
                text: messageText 
            });
            
            console.log('📨 Send response:', response);
            
            if (response?.data?.success) {
                // Add message to local state immediately
                const newMsg = response.data.message;
                console.log('✅ Message sent successfully');
                setMessages(prev => [...prev, newMsg]);
                setNewMessage('');
                setTimeout(scrollToBottom, 100);
            } else {
                console.warn('❌ Failed to send:', response);
                setError(response?.data?.error || 'Failed to send message');
            }
        } catch (err) {
            console.error('❌ Failed to send message:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to send message. Please try again.';
            setError(errorMsg);
        } finally {
            setIsSending(false);
        }
    };

    const formatTime = (timestamp) => {
        const now = new Date();
        const msgTime = new Date(timestamp);
        const diff = now - msgTime;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days === 1) return 'Yesterday';
        return `${days}d ago`;
    };

    return (
        <div className="team-chat-section">
            <div className="chat-header">
                <h2><MessageCircle size={24} /> Team Chat</h2>
                <p className="chat-subtitle">End-to-end encrypted & compressed messages</p>
            </div>
            
            <div className="chat-container">
                <div className="chat-teams-list">
                    <h3>Select Team</h3>
                    {teams.length === 0 ? (
                        <p className="no-teams">No teams available</p>
                    ) : (
                        teams.map(team => (
                            <div
                                key={team._id}
                                className={`chat-team-item ${selectedTeam?._id === team._id ? 'active' : ''}`}
                                onClick={() => setSelectedTeam(team)}
                            >
                                <div className="chat-team-info">
                                    <div className="chat-team-name">{team.name}</div>
                                    <div className="chat-team-members">
                                        <Users2 size={12} />
                                        {team.members?.length || 0} members
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="chat-messages-panel">
                    {!selectedTeam ? (
                        <div className="no-chat-selected">
                            <MessageCircle size={48} />
                            <h3>Select a team to start chatting</h3>
                            <p>Choose a team from the left to view and send messages</p>
                            <div className="encryption-badge">
                                <CheckCircle2 size={16} />
                                <span>Messages are encrypted & compressed</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="chat-messages-header">
                                <div>
                                    <h3>{selectedTeam.name}</h3>
                                    <p>
                                        <Users2 size={14} />
                                        {selectedTeam.members?.length || 0} members
                                    </p>
                                </div>
                                <div className="encryption-indicator">
                                    <CheckCircle2 size={14} />
                                    <span>Encrypted</span>
                                </div>
                            </div>
                            
                            <div className="chat-messages">
                                {isLoading && messages.length === 0 ? (
                                    <div className="chat-loading">
                                        <Loader size={32} className="spinner" />
                                        <p>Loading messages...</p>
                                    </div>
                                ) : error && messages.length === 0 ? (
                                    <div className="chat-error">
                                        <p>{error}</p>
                                        <button onClick={() => loadMessages(selectedTeam._id)} className="retry-btn">
                                            Retry
                                        </button>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="no-messages">
                                        <MessageCircle size={48} />
                                        <p>No messages yet</p>
                                        <span>Start the conversation!</span>
                                    </div>
                                ) : (
                                    messages.map(msg => {
                                        const isOwn = msg.userId._id === currentUser._id || msg.userId === currentUser._id;
                                        const sender = msg.userId?.name || msg.userId;
                                        const senderInitial = sender?.charAt(0).toUpperCase() || '?';
                                        
                                        return (
                                            <div key={msg._id} className={`chat-message ${isOwn ? 'own' : ''}`}>
                                                {!isOwn && (
                                                    <div className="sender-avatar">
                                                        {senderInitial}
                                                    </div>
                                                )}
                                                <div className="message-bubble">
                                                    {!isOwn && (
                                                        <div className="sender-name">{sender}</div>
                                                    )}
                                                    <div className="message-content">{msg.text}</div>
                                                    <div className="message-meta">
                                                        <Clock size={10} />
                                                        <span>{formatTime(msg.timestamp)}</span>
                                                        {isOwn && msg._encrypted && (
                                                            <CheckCircle2 size={10} className="encrypted-icon" title="Encrypted & Compressed" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            
                            {error && (
                                <div className="chat-error-banner">
                                    <span>{error}</span>
                                    <button onClick={() => setError(null)}>×</button>
                                </div>
                            )}
                            
                            <form onSubmit={handleSendMessage} className="chat-input-form">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    className="chat-input"
                                    disabled={isSending}
                                    maxLength={1000}
                                />
                                <button 
                                    type="submit" 
                                    className="chat-send-btn" 
                                    disabled={!newMessage.trim() || isSending}
                                    title="Messages are encrypted and compressed"
                                >
                                    {isSending ? <Loader size={18} className="spinner" /> : <Send size={18} />}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const TeamPage = () => {
        const navigate = useNavigate();
        const { user } = useAuth();
        const [teams, setTeams] = useState([]);
        const [unassigned, setUnassigned] = useState([]);
    const [editingTeamId, setEditingTeamId] = useState(null);
    const [editWorkingMembers, setEditWorkingMembers] = useState([]); // temp members during edit
    const [editAddSelection, setEditAddSelection] = useState([]); // selected unassigned ids to add
        const [showAddModal, setShowAddModal] = useState(false);
        const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
        const [selectedIds, setSelectedIds] = useState(new Set());
        const [activeTab, setActiveTab] = useState('teams'); // 'teams' or 'chat'

    useEffect(() => {
        if (user?.role !== 'manager') {
            navigate('/dashboard');
            return;
        }
                getTeamOverview().then(res => {
                    const data = res.data || {};
                    setTeams(Array.isArray(data.teams) ? data.teams : []);
                    setUnassigned(Array.isArray(data.unassigned) ? data.unassigned : []);
                });
    }, [navigate, user]);

        const currentIds = useMemo(() => {
            const ids = new Set();
            teams.forEach(t => (t.members || []).forEach(m => ids.add(m._id)));
            unassigned.forEach(u => ids.add(u._id));
            return Array.from(ids);
        }, [teams, unassigned]);

        const toggleSelect = (id) => {
            setSelectedIds(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id); else next.add(id);
                return next;
            });
        };

        const clearSelection = () => setSelectedIds(new Set());

        const onTeamCreated = (newTeam) => {
            // Add team, remove its members from unassigned, clear selection
            setTeams(prev => [...prev, newTeam]);
            const createdIds = new Set((newTeam.members || []).map(m => m._id));
            setUnassigned(prev => prev.filter(u => !createdIds.has(u._id)));
            clearSelection();
            alert(`Team "${newTeam.name}" created successfully.`);
        };

        const beginEdit = (team) => {
            setEditingTeamId(team._id);
            setEditWorkingMembers((team.members || []).map(m => ({ ...m })));
            setEditAddSelection([]);
        };

        const cancelEdit = () => {
            setEditingTeamId(null);
            setEditWorkingMembers([]);
            setEditAddSelection([]);
        };

        const removeMemberLocal = (memberId) => {
            setEditWorkingMembers(prev => prev.filter(m => m._id !== memberId));
        };

        const onAddSelectChange = (e) => {
            const values = Array.from(e.target.selectedOptions, o => o.value);
            setEditAddSelection(values);
        };

        const saveEdit = async () => {
            if (!editingTeamId) return;
            // Merge added selections into working members
            const addMaps = new Map(unassigned.filter(u => editAddSelection.includes(u._id)).map(u => [u._id, u]));
            const mergedIds = new Set([ ...editWorkingMembers.map(m => m._id), ...editAddSelection ]);
            const finalIds = Array.from(mergedIds);
            // If no members left, delete the team
            if (finalIds.length === 0) {
                const res = await deleteTeam(editingTeamId);
                const data = res?.data;
                if (data?.success) {
                    setTeams(prev => prev.filter(t => t._id !== editingTeamId));
                    if (Array.isArray(data.unassigned)) setUnassigned(data.unassigned);
                    cancelEdit();
                    return;
                } else {
                    alert(data?.error || 'Failed to delete team.');
                    return;
                }
            }

            // Otherwise update team members as usual
            const res = await updateTeamMembers(editingTeamId, finalIds);
            const data = res?.data;
            if (data?.success) {
                setTeams(prev => prev.map(t => t._id === data.team._id ? data.team : t));
                setUnassigned(Array.isArray(data.unassigned) ? data.unassigned : unassigned);
                cancelEdit();
            } else {
                alert(data?.error || 'Failed to update team.');
            }
        };

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Team Management</h1>
                <div className="tab-navigation">
                    <button 
                        className={`tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
                        onClick={() => setActiveTab('teams')}
                    >
                        <Users2 size={18} /> Teams
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                        onClick={() => setActiveTab('chat')}
                    >
                        <MessageCircle size={18} /> Chat
                    </button>
                </div>
                {activeTab === 'teams' && (
                    <div className="actions-right">
                        <button
                            onClick={() => setShowCreateTeamModal(true)}
                            className="btn-primary create-team-btn"
                            disabled={selectedIds.size === 0}
                            title={selectedIds.size === 0 ? 'Select employees to create a team' : 'Create New Team'}
                        >
                            <Users2 size={18}/> Create New Team
                        </button>
                    </div>
                )}
            </header>

            {activeTab === 'teams' && (
                <div className="teams-content">
                    {/* Teams grouped section - editable */}
                    {teams.map(team => {
                                                                            const isEditing = editingTeamId === team._id;
                                                                            const membersToRender = isEditing ? editWorkingMembers : (team.members || []);
                                                                            const availableToAdd = unassigned; // already filtered to truly unassigned
                                                                            return (
                                                                                <div className="team-card" key={team._id}>
                                                                                    <div className="team-card-header">
                                                                                        <h2 className="team-card-title">{team.name}</h2>
                                                                                        {!isEditing ? (
                                                                                            <button className="icon-button" title="Edit team" onClick={() => beginEdit(team)}>✏️</button>
                                                                                        ) : (
                                                                                            <div className="edit-actions">
                                                                                                <button className="btn-cancel" onClick={cancelEdit}>Cancel</button>
                                                                                                <button className="btn-primary" onClick={saveEdit}>Save Changes</button>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="team-members">
                                                                                        {membersToRender.map((member, idx) => (
                                                                                            <div className="team-member-row" key={member._id}>
                                                                                                <div className="team-member-index">{idx + 1}.</div>
                                                                                                <div className="team-member-name">{member.name}</div>
                                                                                                <div className="team-member-email">{member.email}</div>
                                                                                                <div className="team-member-role-wrap">
                                                                                                    <span className={`role-badge ${member.role?.toLowerCase?.()}`}>{member.role}</span>
                                                                                                    {isEditing && (
                                                                                                        <button className="remove-chip" title="Remove from team" onClick={() => removeMemberLocal(member._id)}>×</button>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                    {isEditing && (
                                                                                        <div className="team-edit-add">
                                                                                            <label className="team-edit-label">Add members from Unassigned</label>
                                                                                            <div className="team-add-list">
                                                                                                {availableToAdd.length === 0 && (
                                                                                                    <div className="team-add-empty">No unassigned employees available.</div>
                                                                                                )}
                                                                                                {availableToAdd.map(u => (
                                                                                                    <label key={u._id} className="add-list-item">
                                                                                                        <input
                                                                                                            type="checkbox"
                                                                                                            checked={editAddSelection.includes(u._id)}
                                                                                                            onChange={() => {
                                                                                                                setEditAddSelection(prev => {
                                                                                                                    const set = new Set(prev);
                                                                                                                    if (set.has(u._id)) set.delete(u._id); else set.add(u._id);
                                                                                                                    return Array.from(set);
                                                                                                                });
                                                                                                            }}
                                                                                                        />
                                                                                                        <span className="add-list-name">{u.name}</span>
                                                                                                        <span className="add-list-email">{u.email}</span>
                                                                                                    </label>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}

                        {/* Unassigned employees with active checkboxes */}
                        <div className="team-table-container">
                                            <div style={{ padding: 16 }}>
                                                <h2 style={{ margin: '0 0 10px', color: '#1F2937' }}>Unassigned Employees</h2>
                            </div>
                                            <table className="team-table">
                                <thead>
                                    <tr>
                                        <th style={{width: '44px'}}></th>
                                        <th>Name</th>
                                        <th>Email</th>
                                                        <th>Role</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {unassigned.map(member => (
                                        <tr key={member._id}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(member._id)}
                                                    onChange={() => toggleSelect(member._id)}
                                                />
                                            </td>
                                            <td>{member.name}</td>
                                            <td>{member.email}</td>
                                                                    <td><span className={`role-badge ${member.role.toLowerCase()}`}>{member.role}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    {showAddModal && null}
                    {showCreateTeamModal && (
                        <CreateTeamModal
                            setShowModal={setShowCreateTeamModal}
                            selectedIds={selectedIds}
                            onCreated={onTeamCreated}
                        />
                    )}
                </div>
            )}

            {activeTab === 'chat' && (
                <TeamChat teams={teams} currentUser={user} />
            )}
        </div>
    );
};

export default TeamPage;