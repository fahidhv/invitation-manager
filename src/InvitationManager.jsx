import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Firebase imports are removed
import { Users, Plus, X, List, CheckCircle, Download, Group, Search } from 'lucide-react';

// --- Local Storage Setup ---
// All Firebase-related constants and variables are removed.
const USE_FIRESTORE = false; // Hardcoded to false
const LOCAL_STORAGE_KEY = 'invitationApp_localData';

// State constant: Fixed group limit
const MAX_GROUPS = 10;

// Utility to generate a stable, simple ID
const generateId = () => crypto.randomUUID();

const App = () => {
  // isAuthReady state is removed as it was only for Firebase
  const [userId, setUserId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true); // Still true to wait for local load
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'groups' or group ID
  const [error, setError] = useState(null);

  // dataDocRef (Firestore reference) is removed.

  // 1. Initialization and Local Load
  useEffect(() => {
    // The entire 'if (USE_FIRESTORE)' block is removed.
    // We now only run the local storage logic.
    const loadLocalData = () => {
      try {
        const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedData) {
          const data = JSON.parse(storedData);
          setGroups(data.groups || []);
        }
      } catch (e) {
        console.error("Error loading from local storage:", e);
        setError("Failed to load data from your browser's storage.");
      }
      setLoading(false);
      setUserId('local_storage_user'); // Dummy ID for local mode
    };
    loadLocalData();
  }, []); // Empty dependency array means this runs only once on mount

  // 2. Real-time Data Listener (Firestore-specific)
  // This entire useEffect hook has been removed as it's not needed for local storage.

  // 3. Data Persistence (Saving to Local Storage)
  const saveData = useCallback((newGroups) => {
    const dataToSave = { groups: newGroups };

    // 'if (USE_FIRESTORE)' block is removed.
    // We now only run the local storage logic.
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
      setGroups(newGroups); // <-- ⭐️ ADD THIS LINE
    } catch (e) {
      console.error("Error saving to local storage:", e);
      setError("Failed to save data to local storage. (Quota might be full)");
    }
  }, []); // dataDocRef dependency is removed

  // 4. Group & Guest Logic
  // This section remains unchanged as it correctly calls the modified saveData function.

  const maxGroups = MAX_GROUPS; // Fixed maximum group count
  const currentGroupCount = groups.length;

  const handleAddGroup = (groupName) => {
    if (currentGroupCount >= maxGroups) {
      return;
    }
    if (!groupName.trim()) return;

    const newGroup = {
      id: generateId(),
      name: groupName.trim(),
      members: [],
    };
    const newGroups = [...groups, newGroup];
    saveData(newGroups);
  };

  const handleAddGuests = (groupId, namesString) => {
    if (!namesString.trim()) return;
    const newMembers = namesString.split(',')
      .map(name => name.trim())
      .filter(name => name)
      .map(name => ({
        id: generateId(),
        name,
        invited: false,
        rsvpStatus: 'Pending',
      }));

    const newGroups = groups.map(group =>
      group.id === groupId
        ? { ...group, members: [...group.members, ...newMembers] }
        : group
    );
    saveData(newGroups);
  };

  const handleToggleInvited = (groupId, memberId) => {
    const newGroups = groups.map(group =>
      group.id === groupId
        ? {
            ...group,
            members: group.members.map(member =>
              member.id === memberId
                ? { ...member, invited: !member.invited }
                : member
            )
          }
        : group
    );
    saveData(newGroups);
  };

  const handleToggleGroupInvited = (groupId) => {
    const groupToToggle = groups.find(g => g.id === groupId);
    if (!groupToToggle) return;

    const allInvited = groupToToggle.members.every(m => m.invited);
    const newState = !allInvited;

    const newGroups = groups.map(group =>
      group.id === groupId
        ? {
            ...group,
            members: group.members.map(member => ({
              ...member,
              invited: newState
            }))
          }
        : group
    );
    saveData(newGroups);
  };

  const handleDeleteMember = (groupId, memberId) => {
    const newGroups = groups.map(group =>
      group.id === groupId
        ? {
            ...group,
            members: group.members.filter(member => member.id !== memberId)
          }
        : group
    );
    saveData(newGroups);
  };

  // 5. Computed Status & Sorting
  // This section remains unchanged.
  const overallSummary = useMemo(() => {
    const totalPeople = groups.reduce((acc, g) => acc + g.members.length, 0);
    const totalInvited = groups.reduce((acc, g) => acc + g.members.filter(m => m.invited).length, 0);
    return {
      totalPeople,
      totalInvited,
      totalRemaining: totalPeople - totalInvited,
    };
  }, [groups]);

  const sortedGroups = useMemo(() => {
    // Groups where not everyone is invited come first (incomplete)
    return [...groups].sort((a, b) => {
      const aComplete = a.members.length > 0 && a.members.every(m => m.invited);
      const bComplete = b.members.length > 0 && b.members.every(m => m.invited);

      if (aComplete === bComplete) return 0;
      if (aComplete) return 1; // a is complete, push it down
      return -1; // b is complete, keep a up
    });
  }, [groups]);

  // 6. Data Export (CSV)
  // This section remains unchanged.
  const exportData = () => {
    // CSV Header: Group Name, Guest Name, Invited Status, RSVP Status
    let csv = 'Group Name,Guest Name,Invited Status,RSVP Status\n';

    groups.forEach(group => {
      group.members.forEach(member => {
        // Simple CSV escape for names containing quotes
        const escapedName = member.name.replace(/"/g, '""');
        const invitedStatus = member.invited ? 'Yes' : 'No';
        const rsvpStatus = member.rsvpStatus || 'Pending'; // Uses the placeholder

        csv += `${group.name},"${escapedName}",${invitedStatus},${rsvpStatus}\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invitation_data_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // --- Components ---
  // All sub-components remain unchanged.

  const SummaryCard = ({ title, value, icon: Icon, color }) => (
    <div className={`p-4 rounded-xl shadow-lg flex items-center justify-between bg-white border-t-4 ${color}`}>
      <div>
        <div className="text-3xl font-bold text-gray-800">{value}</div>
        <div className="text-sm font-medium text-gray-500 mt-1">{title}</div>
      </div>
      <Icon className={`w-8 h-8 ${color.replace('border-t-4 ', 'text-')}`} />
    </div>
  );

  const GroupListItem = ({ group }) => {
    const invitedCount = group.members.filter(m => m.invited).length;
    const totalCount = group.members.length;
    const progress = totalCount > 0 ? (invitedCount / totalCount) * 100 : 0;
    const isComplete = totalCount > 0 && invitedCount === totalCount;

    return (
      <div className={`p-4 mb-3 bg-white rounded-xl shadow-md transition duration-300 ${isComplete ? 'opacity-50 border-l-8 border-green-400' : 'border-l-8 border-blue-500'}`}>
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {group.name}
              {isComplete && <CheckCircle className="inline w-4 h-4 ml-2 text-green-500" />}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {invitedCount} invited / {totalCount} total
            </p>
          </div>
          <button
            onClick={() => setActiveTab(group.id)}
            className="ml-4 px-3 py-1 bg-indigo-500 text-white text-sm font-medium rounded-full shadow-md hover:bg-indigo-600 transition"
          >
            View
          </button>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div
            className={`h-2.5 rounded-full ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    );
  };

  const GroupDetailView = ({ group }) => {
    const [nameInput, setNameInput] = useState('');
    const [listInput, setListInput] = useState('');
    const [memberSearchTerm, setMemberSearchTerm] = useState(''); // New state for member search
    
    // Filter members based on search term
    const filteredMembers = useMemo(() => {
        if (!memberSearchTerm) return group.members;
        return group.members.filter(member =>
            member.name.toLowerCase().includes(memberSearchTerm.toLowerCase())
        );
    }, [group.members, memberSearchTerm]);

    const invitedCount = group.members.filter(m => m.invited).length;
    const totalCount = group.members.length;
    const isComplete = totalCount > 0 && invitedCount === totalCount;

    const handleNameAdd = () => {
      if (nameInput) {
        handleAddGuests(group.id, nameInput);
        setNameInput('');
      }
    };

    const handleListAdd = () => {
      if (listInput) {
        handleAddGuests(group.id, listInput);
        setListInput('');
      }
    };

    return (
      <div className="p-4 sm:p-6 bg-white rounded-xl shadow-2xl h-full overflow-y-auto">
        <button
          onClick={() => setActiveTab('groups')}
          className="text-indigo-600 font-medium mb-4 flex items-center hover:text-indigo-800 transition"
        >
          <X className="w-4 h-4 mr-1" /> Back to Groups
        </button>

        <h2 className="text-3xl font-extrabold text-gray-900 mb-4">{group.name}</h2>
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div className="text-xl font-semibold">
            {invitedCount} / {totalCount} Total Guests
          </div>
          <button
            onClick={() => handleToggleGroupInvited(group.id)}
            className={`flex items-center px-4 py-2 rounded-lg font-semibold shadow-md transition ${isComplete ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600'}`}
          >
            {isComplete ? 'Un-invite All' : 'Invite All'}
          </button>
        </div>

        {/* Input Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Individual Guest Input */}
            <div className="p-4 border rounded-xl bg-gray-50 shadow-inner">
              <label className="block text-sm font-medium text-gray-700 mb-2">Add Individual Guest</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter name..."
                  className="flex-grow p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  onKeyPress={(e) => { if (e.key === 'Enter') handleNameAdd(); }}
                />
                <button
                  onClick={handleNameAdd}
                  className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Comma Separated Input */}
            <div className="p-4 border rounded-xl bg-gray-50 shadow-inner">
              <label className="block text-sm font-medium text-gray-700 mb-2">Paste Comma-Separated List</label>
              <div className="flex space-x-2">
                <textarea
                  value={listInput}
                  onChange={(e) => setListInput(e.target.value)}
                  placeholder="e.g., John Doe, Jane Smith"
                  rows="2"
                  className="flex-grow p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                ></textarea>
                <button
                  onClick={handleListAdd}
                  className="p-2 self-end bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition min-w-fit"
                >
                  <Plus className="w-5 h-5" /> Add List
                </button>
              </div>
            </div>
        </div>

        {/* Member Search Input */}
        <div className="mb-6 relative">
            <input
                type="text"
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                placeholder="Search guests by name..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>


        {/* Guest List */}
        <ul className="space-y-3">
          {filteredMembers.map(member => (
            <li key={member.id} className="flex justify-between items-center p-3 border-b border-gray-100 bg-white hover:bg-gray-50 rounded-lg shadow-sm">
              <div className="text-gray-900 font-medium flex-1 truncate">
                {member.name}
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handleToggleInvited(group.id, member.id)}
                  className={`p-1.5 rounded-full shadow transition ${member.invited ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  title={member.invited ? 'Invited' : 'Not Invited'}
                >
                  <CheckCircle className={`w-5 h-5 ${member.invited ? 'text-white' : 'text-gray-500'}`} />
                </button>
                <button
                  onClick={() => handleDeleteMember(group.id, member.id)}
                  className="text-red-500 hover:text-red-700"
                  title="Delete Member"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </li>
          ))}
          {group.members.length === 0 && (
            <p className="text-center text-gray-500 py-6">No guests added yet. Start adding names above!</p>
          )}
          {group.members.length > 0 && filteredMembers.length === 0 && memberSearchTerm && (
            <p className="text-center text-gray-500 py-6">No guests found matching "{memberSearchTerm}".</p>
          )}
        </ul>
      </div>
    );
  };

  const GroupManagementTab = () => {
    const [newGroupName, setNewGroupName] = useState('');
    const [groupSearchTerm, setGroupSearchTerm] = useState(''); // New state for group search

    const handleSubmit = (e) => {
      e.preventDefault();
      handleAddGroup(newGroupName);
      setNewGroupName('');
    };
    
    // Filter groups based on search term
    const filteredGroups = useMemo(() => {
        if (!groupSearchTerm) return sortedGroups;
        return sortedGroups.filter(group =>
            group.name.toLowerCase().includes(groupSearchTerm.toLowerCase())
        );
    }, [sortedGroups, groupSearchTerm]);

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Your Groups ({currentGroupCount}/{maxGroups})</h2>

        {/* Add New Group Form */}
        <div className="p-4 bg-indigo-50 border-indigo-200 border-2 rounded-xl shadow-md">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Enter Group Name (e.g., Family, HR)"
              className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={currentGroupCount >= maxGroups}
              className={`p-3 text-white rounded-lg font-semibold shadow-md transition ${currentGroupCount >= maxGroups ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              <Plus className="w-5 h-5 inline mr-1" /> Add Group
            </button>
          </form>
          {currentGroupCount >= maxGroups && (
            <p className="text-sm text-red-600 mt-2 font-medium">
              You've reached the maximum limit of {MAX_GROUPS} groups.
            </p>
          )}
        </div>
        
        {/* Group Search Input */}
        <div className="mb-6 relative">
            <input
                type="text"
                placeholder="Search groups..."
                value={groupSearchTerm}
                onChange={(e) => setGroupSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>

        {/* Group List */}
        <div className="mt-4">
          {filteredGroups.map(group => (
            <GroupListItem key={group.id} group={group} />
          ))}
          {groups.length > 0 && filteredGroups.length === 0 && groupSearchTerm && (
            <p className="text-center text-gray-500 py-6">No groups found matching "{groupSearchTerm}".</p>
          )}
        </div>
      </div>
    );
  };

  // --- Main Render ---

  // Loading state check is simplified
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="text-xl font-semibold text-indigo-600">Loading Invitation Manager...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 bg-red-100 border border-red-400 text-red-700 rounded-lg m-4">
        <p className="font-bold">Error:</p>
        <p>{error}</p>
        <p className="mt-2 text-sm">Data saving is likely disabled. Check the console.</p>
      </div>
    );
  }

  // Check if we are viewing a specific group detail
  const currentGroup = groups.find(g => g.id === activeTab);
  if (currentGroup) {
    return (
      <div className="min-h-screen bg-gray-100 p-0 sm:p-4">
        <GroupDetailView group={currentGroup} />
      </div>
    );
  }

  // Home Screen / Summary View
  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900">Free Event/Invitation Manager</h1><h2 className="text-4xl font-extrabold text-gray-900">by Wokeio</h2>
        <p className="text-gray-500 mt-1">
            {/* This will now always show 'Local Data' */}
            {USE_FIRESTORE ? 'Online Data (Firestore)' : 'Local Data (Browser Storage)'} | User ID:
            <span className="text-xs break-all bg-gray-200 p-1 rounded ml-1">{userId}</span>
        </p>
      </header>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-300 mb-6">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 py-3 text-lg font-semibold border-b-2 transition duration-150 ${activeTab === 'summary' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <List className="w-5 h-5 inline mr-2" /> Summary
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 py-3 text-lg font-semibold border-b-2 transition duration-150 ${activeTab === 'groups' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Group className="w-5 h-5 inline mr-2" /> Groups ({currentGroupCount})
        </button>
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Overall Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard
              title="Total Invited"
              value={overallSummary.totalInvited}
              icon={CheckCircle}
              color="border-t-4 border-green-500 text-green-500"
            />
            <SummaryCard
              title="Total Remaining"
              value={overallSummary.totalRemaining}
              icon={Users}
              color="border-t-4 border-red-500 text-red-500"
            />
            <SummaryCard
              title="Total Guests"
              value={overallSummary.totalPeople}
              icon={Users}
              color="border-t-4 border-blue-500 text-blue-500"
            />
          </div>

          <button
            onClick={exportData}
            className="w-full flex items-center justify-center px-4 py-3 bg-indigo-500 text-white font-semibold rounded-xl shadow-lg hover:bg-indigo-600 transition mt-6"
          >
            <Download className="w-5 h-5 mr-2" /> Download Data (CSV)
          </button>
        </div>
      )}

      {activeTab === 'groups' && <GroupManagementTab />}

    </div>
  );
};

export default App;
