
import React, { useState, useEffect, useMemo } from 'react';
import { getTeamOverview, getAvailableUsers, addExistingMembers, createTeam, updateTeamMembers, deleteTeam } from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Users2 } from 'lucide-react';
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
            </header>

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
        </div>
    );
};

export default TeamPage;