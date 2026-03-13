import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateUserProfile, getCurrentUser, getUserPreferences } from '../../api/redmineAdapter';
import { loginSuccess } from '../../store/authSlice';
import { User, Mail, Globe, Key, Bell, Settings, Eye, Clock, MessageSquare, AlertTriangle, Code, FolderTree } from 'lucide-react';

export default function ProfilePage() {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const [formState, setFormState] = useState({
    // Information
    firstname: '',
    lastname: '',
    mail: '',
    language: 'en',
    gitlab_token: '',
    // Email notifications
    mail_notification: 'only_my_events',
    notified_project_ids: [],
    notify_about_high_priority_issues: false,
    no_self_notified: false,
    auto_watch_on: [],
    // Preferences
    hide_mail: false,
    time_zone: 'New Delhi',
    comments_sorting: 'asc',
    warn_on_leaving_unsaved: false,
    textarea_font: '',
    recently_used_projects: '3',
    history_default_tab: 'notes',
    toolbar_language_options: 'c,cpp,csharp,css,diff,go,groovy,html,java,javascript,objc,perl,php,python,r,ruby,sass,scala,shell,sql,swift,xml,yaml',
    default_issue_query: '',
    default_project_query: '',
    dmsf_tree_view: false
  });
  const [status, setStatus] = useState({ type: null, message: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  const userId = user?.id;

  // Time zone options (complete list from Redmine) - moved here to be accessible in useEffect
  const timeZones = [
    { value: '', label: ' ' },
    { value: 'International Date Line West', label: '(GMT-12:00) International Date Line West' },
    { value: 'American Samoa', label: '(GMT-11:00) American Samoa' },
    { value: 'Midway Island', label: '(GMT-11:00) Midway Island' },
    { value: 'Hawaii', label: '(GMT-10:00) Hawaii' },
    { value: 'Alaska', label: '(GMT-09:00) Alaska' },
    { value: 'Pacific Time (US & Canada)', label: '(GMT-08:00) Pacific Time (US & Canada)' },
    { value: 'Tijuana', label: '(GMT-08:00) Tijuana' },
    { value: 'Arizona', label: '(GMT-07:00) Arizona' },
    { value: 'Mazatlan', label: '(GMT-07:00) Mazatlan' },
    { value: 'Mountain Time (US & Canada)', label: '(GMT-07:00) Mountain Time (US & Canada)' },
    { value: 'Central America', label: '(GMT-06:00) Central America' },
    { value: 'Central Time (US & Canada)', label: '(GMT-06:00) Central Time (US & Canada)' },
    { value: 'Chihuahua', label: '(GMT-06:00) Chihuahua' },
    { value: 'Guadalajara', label: '(GMT-06:00) Guadalajara' },
    { value: 'Mexico City', label: '(GMT-06:00) Mexico City' },
    { value: 'Monterrey', label: '(GMT-06:00) Monterrey' },
    { value: 'Saskatchewan', label: '(GMT-06:00) Saskatchewan' },
    { value: 'Bogota', label: '(GMT-05:00) Bogota' },
    { value: 'Eastern Time (US & Canada)', label: '(GMT-05:00) Eastern Time (US & Canada)' },
    { value: 'Indiana (East)', label: '(GMT-05:00) Indiana (East)' },
    { value: 'Lima', label: '(GMT-05:00) Lima' },
    { value: 'Quito', label: '(GMT-05:00) Quito' },
    { value: 'Atlantic Time (Canada)', label: '(GMT-04:00) Atlantic Time (Canada)' },
    { value: 'Caracas', label: '(GMT-04:00) Caracas' },
    { value: 'Georgetown', label: '(GMT-04:00) Georgetown' },
    { value: 'La Paz', label: '(GMT-04:00) La Paz' },
    { value: 'Puerto Rico', label: '(GMT-04:00) Puerto Rico' },
    { value: 'Santiago', label: '(GMT-04:00) Santiago' },
    { value: 'Newfoundland', label: '(GMT-03:30) Newfoundland' },
    { value: 'Brasilia', label: '(GMT-03:00) Brasilia' },
    { value: 'Buenos Aires', label: '(GMT-03:00) Buenos Aires' },
    { value: 'Montevideo', label: '(GMT-03:00) Montevideo' },
    { value: 'Mid-Atlantic', label: '(GMT-02:00) Mid-Atlantic' },
    { value: 'Azores', label: '(GMT-01:00) Azores' },
    { value: 'Cape Verde Is.', label: '(GMT-01:00) Cape Verde Is.' },
    { value: 'Casablanca', label: '(GMT+00:00) Casablanca' },
    { value: 'Dublin', label: '(GMT+00:00) Dublin' },
    { value: 'Edinburgh', label: '(GMT+00:00) Edinburgh' },
    { value: 'Lisbon', label: '(GMT+00:00) Lisbon' },
    { value: 'London', label: '(GMT+00:00) London' },
    { value: 'Monrovia', label: '(GMT+00:00) Monrovia' },
    { value: 'UTC', label: '(GMT+00:00) UTC' },
    { value: 'Amsterdam', label: '(GMT+01:00) Amsterdam' },
    { value: 'Belgrade', label: '(GMT+01:00) Belgrade' },
    { value: 'Berlin', label: '(GMT+01:00) Berlin' },
    { value: 'Bern', label: '(GMT+01:00) Bern' },
    { value: 'Bratislava', label: '(GMT+01:00) Bratislava' },
    { value: 'Brussels', label: '(GMT+01:00) Brussels' },
    { value: 'Budapest', label: '(GMT+01:00) Budapest' },
    { value: 'Copenhagen', label: '(GMT+01:00) Copenhagen' },
    { value: 'Ljubljana', label: '(GMT+01:00) Ljubljana' },
    { value: 'Madrid', label: '(GMT+01:00) Madrid' },
    { value: 'Paris', label: '(GMT+01:00) Paris' },
    { value: 'Prague', label: '(GMT+01:00) Prague' },
    { value: 'Rome', label: '(GMT+01:00) Rome' },
    { value: 'Sarajevo', label: '(GMT+01:00) Sarajevo' },
    { value: 'Skopje', label: '(GMT+01:00) Skopje' },
    { value: 'Stockholm', label: '(GMT+01:00) Stockholm' },
    { value: 'Vienna', label: '(GMT+01:00) Vienna' },
    { value: 'Warsaw', label: '(GMT+01:00) Warsaw' },
    { value: 'West Central Africa', label: '(GMT+01:00) West Central Africa' },
    { value: 'Zagreb', label: '(GMT+01:00) Zagreb' },
    { value: 'Zurich', label: '(GMT+01:00) Zurich' },
    { value: 'Athens', label: '(GMT+02:00) Athens' },
    { value: 'Bucharest', label: '(GMT+02:00) Bucharest' },
    { value: 'Cairo', label: '(GMT+02:00) Cairo' },
    { value: 'Harare', label: '(GMT+02:00) Harare' },
    { value: 'Helsinki', label: '(GMT+02:00) Helsinki' },
    { value: 'Jerusalem', label: '(GMT+02:00) Jerusalem' },
    { value: 'Kaliningrad', label: '(GMT+02:00) Kaliningrad' },
    { value: 'Pretoria', label: '(GMT+02:00) Pretoria' },
    { value: 'Riga', label: '(GMT+02:00) Riga' },
    { value: 'Sofia', label: '(GMT+02:00) Sofia' },
    { value: 'Tallinn', label: '(GMT+02:00) Tallinn' },
    { value: 'Vilnius', label: '(GMT+02:00) Vilnius' },
    { value: 'Baghdad', label: '(GMT+03:00) Baghdad' },
    { value: 'Istanbul', label: '(GMT+03:00) Istanbul' },
    { value: 'Kuwait', label: '(GMT+03:00) Kuwait' },
    { value: 'Minsk', label: '(GMT+03:00) Minsk' },
    { value: 'Moscow', label: '(GMT+03:00) Moscow' },
    { value: 'Nairobi', label: '(GMT+03:00) Nairobi' },
    { value: 'Riyadh', label: '(GMT+03:00) Riyadh' },
    { value: 'St. Petersburg', label: '(GMT+03:00) St. Petersburg' },
    { value: 'Volgograd', label: '(GMT+03:00) Volgograd' },
    { value: 'Tehran', label: '(GMT+03:30) Tehran' },
    { value: 'Abu Dhabi', label: '(GMT+04:00) Abu Dhabi' },
    { value: 'Baku', label: '(GMT+04:00) Baku' },
    { value: 'Muscat', label: '(GMT+04:00) Muscat' },
    { value: 'Samara', label: '(GMT+04:00) Samara' },
    { value: 'Tbilisi', label: '(GMT+04:00) Tbilisi' },
    { value: 'Yerevan', label: '(GMT+04:00) Yerevan' },
    { value: 'Kabul', label: '(GMT+04:30) Kabul' },
    { value: 'Almaty', label: '(GMT+05:00) Almaty' },
    { value: 'Astana', label: '(GMT+05:00) Astana' },
    { value: 'Ekaterinburg', label: '(GMT+05:00) Ekaterinburg' },
    { value: 'Islamabad', label: '(GMT+05:00) Islamabad' },
    { value: 'Karachi', label: '(GMT+05:00) Karachi' },
    { value: 'Tashkent', label: '(GMT+05:00) Tashkent' },
    { value: 'Chennai', label: '(GMT+05:30) Chennai' },
    { value: 'Kolkata', label: '(GMT+05:30) Kolkata' },
    { value: 'Mumbai', label: '(GMT+05:30) Mumbai' },
    { value: 'New Delhi', label: '(GMT+05:30) New Delhi' },
    { value: 'Sri Jayawardenepura', label: '(GMT+05:30) Sri Jayawardenepura' },
    { value: 'Kathmandu', label: '(GMT+05:45) Kathmandu' },
    { value: 'Dhaka', label: '(GMT+06:00) Dhaka' },
    { value: 'Urumqi', label: '(GMT+06:00) Urumqi' },
    { value: 'Bangkok', label: '(GMT+07:00) Bangkok' },
    { value: 'Hanoi', label: '(GMT+07:00) Hanoi' },
    { value: 'Jakarta', label: '(GMT+07:00) Jakarta' },
    { value: 'Krasnoyarsk', label: '(GMT+07:00) Krasnoyarsk' },
    { value: 'Novosibirsk', label: '(GMT+07:00) Novosibirsk' },
    { value: 'Beijing', label: '(GMT+08:00) Beijing' },
    { value: 'Chongqing', label: '(GMT+08:00) Chongqing' },
    { value: 'Hong Kong', label: '(GMT+08:00) Hong Kong' },
    { value: 'Irkutsk', label: '(GMT+08:00) Irkutsk' },
    { value: 'Kuala Lumpur', label: '(GMT+08:00) Kuala Lumpur' },
    { value: 'Perth', label: '(GMT+08:00) Perth' },
    { value: 'Singapore', label: '(GMT+08:00) Singapore' },
    { value: 'Taipei', label: '(GMT+08:00) Taipei' },
    { value: 'Ulaanbaatar', label: '(GMT+08:00) Ulaanbaatar' },
    { value: 'Osaka', label: '(GMT+09:00) Osaka' },
    { value: 'Sapporo', label: '(GMT+09:00) Sapporo' },
    { value: 'Seoul', label: '(GMT+09:00) Seoul' },
    { value: 'Tokyo', label: '(GMT+09:00) Tokyo' },
    { value: 'Yakutsk', label: '(GMT+09:00) Yakutsk' },
    { value: 'Adelaide', label: '(GMT+09:30) Adelaide' },
    { value: 'Darwin', label: '(GMT+09:30) Darwin' },
    { value: 'Brisbane', label: '(GMT+10:00) Brisbane' },
    { value: 'Canberra', label: '(GMT+10:00) Canberra' },
    { value: 'Guam', label: '(GMT+10:00) Guam' },
    { value: 'Hobart', label: '(GMT+10:00) Hobart' },
    { value: 'Melbourne', label: '(GMT+10:00) Melbourne' },
    { value: 'Port Moresby', label: '(GMT+10:00) Port Moresby' },
    { value: 'Sydney', label: '(GMT+10:00) Sydney' },
    { value: 'Vladivostok', label: '(GMT+10:00) Vladivostok' },
    { value: 'Magadan', label: '(GMT+11:00) Magadan' },
    { value: 'New Caledonia', label: '(GMT+11:00) New Caledonia' },
    { value: 'Solomon Is.', label: '(GMT+11:00) Solomon Is.' },
    { value: 'Srednekolymsk', label: '(GMT+11:00) Srednekolymsk' },
    { value: 'Auckland', label: '(GMT+12:00) Auckland' },
    { value: 'Fiji', label: '(GMT+12:00) Fiji' },
    { value: 'Kamchatka', label: '(GMT+12:00) Kamchatka' },
    { value: 'Marshall Is.', label: '(GMT+12:00) Marshall Is.' },
    { value: 'Wellington', label: '(GMT+12:00) Wellington' },
    { value: 'Chatham Is.', label: '(GMT+12:45) Chatham Is.' },
    { value: 'Nuku\'alofa', label: '(GMT+13:00) Nuku\'alofa' },
    { value: 'Samoa', label: '(GMT+13:00) Samoa' },
    { value: 'Tokelau Is.', label: '(GMT+13:00) Tokelau Is.' }
  ];

  const displayName = useMemo(() => {
    if (!user) return 'Profile';
    const first = user.firstname || user.name?.split(' ')[0] || user.login || '';
    const last = user.lastname || user.name?.split(' ')[1] || '';
    return `${first} ${last}`.trim();
  }, [user]);

  useEffect(() => {
    // Only load data once when component mounts or user changes initially
    if (dataLoaded || !user) return;
    
    async function loadUserData() {
      setIsLoading(true);
      
      // Fetch fresh user data from /users/current.json to get latest account data
      try {
        const currentUser = await getCurrentUser();
        console.log('[ProfilePage] Loaded user data:', currentUser);
        
        // Fetch user preferences from Redmine (time_zone, comments_sorting, etc.)
        const fetchedPrefs = await getUserPreferences();
        console.log('[ProfilePage] Loaded preferences:', fetchedPrefs);
        console.log('[ProfilePage] Time zone from fetched prefs:', fetchedPrefs.time_zone);
        console.log('[ProfilePage] Comments sorting from fetched prefs:', fetchedPrefs.comments_sorting);
        
        // Merge preferences: fetched preferences take priority, then currentUser.pref, then user.pref
        const pref = {
          ...(user?.pref || {}),
          ...(currentUser.pref || {}),
          ...fetchedPrefs
        };
        
        console.log('[ProfilePage] Merged preferences:', pref);
        console.log('[ProfilePage] Final time_zone value:', pref.time_zone);
        console.log('[ProfilePage] Final comments_sorting value:', pref.comments_sorting);
        
        // Map fields from API response
        const firstName = currentUser.firstname || currentUser.first_name || user.firstname || '';
        const lastName = currentUser.lastname || currentUser.last_name || user.lastname || '';
        const email = currentUser.mail || currentUser.email || user.mail || user.email || '';
        const language = currentUser.language || currentUser.locale || user.language || 'en';
        
        // gitlab_token is now a direct column, should be in currentUser.gitlab_token
        const gitlabToken = currentUser.gitlab_token || 
                           currentUser.gitlab_access_token || 
                           user?.gitlab_token || 
                           user?.gitlab_access_token || 
                           '';
        
        console.log('[ProfilePage] GitLab token extraction:', {
          'currentUser.gitlab_token': currentUser.gitlab_token ? '***' : '(empty/undefined)',
          'currentUser.gitlab_access_token': currentUser.gitlab_access_token ? '***' : '(empty/undefined)',
          'user.gitlab_token': user?.gitlab_token ? '***' : '(empty/undefined)',
          'user.gitlab_access_token': user?.gitlab_access_token ? '***' : '(empty/undefined)',
          'final gitlabToken': gitlabToken ? '***' : '(empty)'
        });
        
        // Normalize time_zone value to ensure it matches dropdown options
        let timeZoneValue = (pref.time_zone !== undefined && pref.time_zone !== null) 
          ? pref.time_zone 
          : ((currentUser.time_zone !== undefined && currentUser.time_zone !== null) 
            ? currentUser.time_zone 
            : 'New Delhi');
        
        // Decode HTML entities if present (e.g., &amp; -> &)
        if (timeZoneValue) {
          const textarea = document.createElement('textarea');
          textarea.innerHTML = timeZoneValue;
          timeZoneValue = textarea.value;
        }
        
        // Verify the time zone value exists in our dropdown options
        const timeZoneExists = timeZones.some(tz => tz.value === timeZoneValue);
        if (!timeZoneExists && timeZoneValue) {
          console.warn('[ProfilePage] Time zone value not found in options:', timeZoneValue);
          console.log('[ProfilePage] Available time zones:', timeZones.map(tz => tz.value));
          // Try to find a match by case-insensitive comparison
          const matchedTz = timeZones.find(tz => tz.value.toLowerCase() === timeZoneValue.toLowerCase());
          if (matchedTz) {
            console.log('[ProfilePage] Found case-insensitive match:', matchedTz.value);
            timeZoneValue = matchedTz.value;
          } else {
            // If no match found, use default
            console.warn('[ProfilePage] No match found, using default: New Delhi');
            timeZoneValue = 'New Delhi';
          }
        }
        
        console.log('[ProfilePage] Setting time_zone value:', timeZoneValue);
        
        setFormState({
          // Information
          firstname: firstName,
          lastname: lastName,
          mail: email,
          language: language,
          gitlab_token: gitlabToken,
          // Email notifications
          mail_notification: pref.mail_notification || currentUser.mail_notification || 'only_my_events',
          notified_project_ids: pref.notified_project_ids || currentUser.notified_project_ids || [],
          notify_about_high_priority_issues: pref.notify_about_high_priority_issues === '1' || pref.notify_about_high_priority_issues === true,
          no_self_notified: pref.no_self_notified === '1' || pref.no_self_notified === true,
          auto_watch_on: pref.auto_watch_on || currentUser.auto_watch_on || [],
          // Preferences
          hide_mail: pref.hide_mail === '1' || pref.hide_mail === true,
          // Use normalized time_zone value
          time_zone: timeZoneValue,
          comments_sorting: (pref.comments_sorting !== undefined && pref.comments_sorting !== null) 
            ? pref.comments_sorting 
            : ((currentUser.comments_sorting !== undefined && currentUser.comments_sorting !== null) 
              ? currentUser.comments_sorting 
              : 'asc'),
          warn_on_leaving_unsaved: pref.warn_on_leaving_unsaved === '1' || pref.warn_on_leaving_unsaved === true,
          textarea_font: pref.textarea_font || currentUser.textarea_font || '',
          recently_used_projects: pref.recently_used_projects || currentUser.recently_used_projects || '3',
          history_default_tab: pref.history_default_tab || currentUser.history_default_tab || 'notes',
          toolbar_language_options: pref.toolbar_language_options || currentUser.toolbar_language_options || 'c,cpp,csharp,css,diff,go,groovy,html,java,javascript,objc,perl,php,python,r,ruby,sass,scala,shell,sql,swift,xml,yaml',
          default_issue_query: pref.default_issue_query || currentUser.default_issue_query || '',
          default_project_query: pref.default_project_query || currentUser.default_project_query || '',
          dmsf_tree_view: pref.dmsf_tree_view === '1' || pref.dmsf_tree_view === true
        });
        
        // Update Redux store with fresh data
        if (currentUser) {
          dispatch(loginSuccess({ 
            user: {
              ...currentUser,
              firstname: firstName,
              lastname: lastName,
              mail: email,
              language: language,
              gitlab_token: gitlabToken,
              pref: pref
            }, 
            csrfToken: null 
          }));
        }
        
        setDataLoaded(true);
      } catch (error) {
        console.warn('[ProfilePage] Could not fetch fresh user data, using cached:', error);
        // Fallback to cached user data
        const pref = user?.pref || {};
        setFormState({
          firstname: user.firstname || '',
          lastname: user.lastname || '',
          mail: user.mail || user.email || '',
          language: user.language || 'en',
          gitlab_token: user.gitlab_token || user.gitlab_access_token || '',
          mail_notification: pref.mail_notification || 'only_my_events',
          notified_project_ids: pref.notified_project_ids || [],
          notify_about_high_priority_issues: pref.notify_about_high_priority_issues === '1' || false,
          no_self_notified: pref.no_self_notified === '1' || false,
          auto_watch_on: pref.auto_watch_on || [],
          hide_mail: pref.hide_mail === '1' || false,
          time_zone: pref.time_zone || 'New Delhi',
          comments_sorting: pref.comments_sorting || 'asc',
          warn_on_leaving_unsaved: pref.warn_on_leaving_unsaved === '1' || false,
          textarea_font: pref.textarea_font || '',
          recently_used_projects: pref.recently_used_projects || '3',
          history_default_tab: pref.history_default_tab || 'notes',
          toolbar_language_options: pref.toolbar_language_options || 'c,cpp,csharp,css,diff,go,groovy,html,java,javascript,objc,perl,php,python,r,ruby,sass,scala,shell,sql,swift,xml,yaml',
          default_issue_query: pref.default_issue_query || '',
          default_project_query: pref.default_project_query || '',
          dmsf_tree_view: pref.dmsf_tree_view === '1' || false
        });
        setDataLoaded(true);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadUserData();
  }, [user, dispatch, dataLoaded]);

  const handleChange = (field, value) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field, checked) => {
    setFormState(prev => ({ ...prev, [field]: checked }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!userId) {
      setStatus({ type: 'error', message: 'Unable to determine user id.' });
      return;
    }

    setIsSaving(true);
    setStatus({ type: null, message: '' });

    try {
      const payload = {
        // User fields
        firstname: formState.firstname,
        lastname: formState.lastname,
        mail: formState.mail,
        language: formState.language,
        gitlab_token: formState.gitlab_token,
        // Preferences
        pref: {
          mail_notification: formState.mail_notification,
          notified_project_ids: formState.notified_project_ids,
          notify_about_high_priority_issues: formState.notify_about_high_priority_issues ? '1' : '0',
          no_self_notified: formState.no_self_notified ? '1' : '0',
          auto_watch_on: formState.auto_watch_on,
          hide_mail: formState.hide_mail ? '1' : '0',
          time_zone: formState.time_zone,
          comments_sorting: formState.comments_sorting,
          warn_on_leaving_unsaved: formState.warn_on_leaving_unsaved ? '1' : '0',
          textarea_font: formState.textarea_font,
          recently_used_projects: formState.recently_used_projects,
          history_default_tab: formState.history_default_tab,
          toolbar_language_options: formState.toolbar_language_options,
          default_issue_query: formState.default_issue_query,
          default_project_query: formState.default_project_query,
          dmsf_tree_view: formState.dmsf_tree_view ? '1' : '0'
        }
      };

      console.log('[ProfilePage] Updating profile with payload:', { ...payload, gitlab_token: '***' });

      const response = await updateUserProfile(userId, payload);

      console.log('[ProfilePage] Update response:', response);

      // Update local redux store if response contains user
      const updatedUser = response?.user ? { ...user, ...response.user } : { ...user, ...payload };
      dispatch(loginSuccess({ user: updatedUser, csrfToken: null }));

      // Refresh form state with updated data
      if (response?.user) {
        const pref = response.user.pref || {};
        setFormState(prev => ({
          ...prev,
          firstname: response.user.firstname || prev.firstname,
          lastname: response.user.lastname || prev.lastname,
          mail: response.user.mail || response.user.email || prev.mail,
          language: response.user.language || prev.language,
          gitlab_token: response.user.gitlab_token || response.user.gitlab_access_token || prev.gitlab_token,
          mail_notification: pref.mail_notification || prev.mail_notification,
          notify_about_high_priority_issues: pref.notify_about_high_priority_issues === '1' || false,
          no_self_notified: pref.no_self_notified === '1' || false,
          hide_mail: pref.hide_mail === '1' || false,
          time_zone: pref.time_zone || prev.time_zone,
          comments_sorting: pref.comments_sorting || prev.comments_sorting,
          warn_on_leaving_unsaved: pref.warn_on_leaving_unsaved === '1' || false,
          dmsf_tree_view: pref.dmsf_tree_view === '1' || false
        }));
      }

      setStatus({ type: 'success', message: 'Profile updated successfully.' });
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    } catch (error) {
      console.error('[ProfilePage] Update error:', error);
      setStatus({ type: 'error', message: error.message || 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const pref = user?.pref || {};
    setFormState({
      firstname: user?.firstname || '',
      lastname: user?.lastname || '',
      mail: user?.mail || user?.email || '',
      language: user?.language || 'en',
      gitlab_token: user?.gitlab_token || user?.gitlab_access_token || '',
      mail_notification: pref.mail_notification || 'only_my_events',
      notified_project_ids: pref.notified_project_ids || [],
      notify_about_high_priority_issues: pref.notify_about_high_priority_issues === '1' || false,
      no_self_notified: pref.no_self_notified === '1' || false,
      auto_watch_on: pref.auto_watch_on || [],
      hide_mail: pref.hide_mail === '1' || false,
      time_zone: pref.time_zone || 'New Delhi',
      comments_sorting: pref.comments_sorting || 'asc',
      warn_on_leaving_unsaved: pref.warn_on_leaving_unsaved === '1' || false,
      textarea_font: pref.textarea_font || '',
      recently_used_projects: pref.recently_used_projects || '3',
      history_default_tab: pref.history_default_tab || 'notes',
      toolbar_language_options: pref.toolbar_language_options || 'c,cpp,csharp,css,diff,go,groovy,html,java,javascript,objc,perl,php,python,r,ruby,sass,scala,shell,sql,swift,xml,yaml',
      default_issue_query: pref.default_issue_query || '',
      default_project_query: pref.default_project_query || '',
      dmsf_tree_view: pref.dmsf_tree_view === '1' || false
    });
    setStatus({ type: null, message: '' });
  };

  // Time zone options are defined at the top of the component (line 44)

  return (
    <div className="w-full">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--theme-text)] mb-2">My account</h1>
          <p className="text-sm text-[var(--theme-textSecondary)]">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Status Message */}
        {status.type && (
          <div className={`mb-6 px-4 py-3 rounded-lg text-sm ${
            status.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20'
              : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300 border border-red-200 dark:border-red-500/20'
          }`}>
            {status.message}
          </div>
        )}

        {/* Main Content */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Information Section */}
          <div 
            className="rounded-xl border border-[var(--theme-border)] shadow-sm overflow-hidden theme-transition"
            style={{ backgroundColor: 'var(--theme-cardBg)' }}
          >
            <div 
              className="px-6 py-4 text-white font-semibold text-sm"
              style={{ 
                background: 'linear-gradient(135deg, #14b8a6, #0d9488)'
              }}
            >
              Information
            </div>
            
            {isLoading ? (
              <div className="p-6 flex items-center justify-center">
                <div className="flex items-center gap-2 text-[var(--theme-textSecondary)]">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--theme-primary)]"></div>
                  <span>Loading profile data...</span>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--theme-text)]">
                      First name<span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-textSecondary)]" />
                      <input
                        value={formState.firstname}
                        onChange={(e) => handleChange('firstname', e.target.value)}
                        required
                        className="w-full h-11 pl-10 pr-4 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] placeholder:text-[var(--theme-textSecondary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)] transition-all"
                        placeholder="Enter first name"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--theme-text)]">
                      Last name<span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-textSecondary)]" />
                      <input
                        value={formState.lastname}
                        onChange={(e) => handleChange('lastname', e.target.value)}
                        required
                        className="w-full h-11 pl-10 pr-4 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] placeholder:text-[var(--theme-textSecondary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)] transition-all"
                        placeholder="Enter last name"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--theme-text)]">
                      Email<span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-textSecondary)]" />
                      <input
                        type="email"
                        value={formState.mail}
                        onChange={(e) => handleChange('mail', e.target.value)}
                        required
                        className="w-full h-11 pl-10 pr-4 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] placeholder:text-[var(--theme-textSecondary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)] transition-all"
                        placeholder="name@company.com"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--theme-text)]">
                      Language
                    </label>
                    <div className="relative">
                      <Globe size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-textSecondary)] pointer-events-none z-10" />
                      <select
                        value={formState.language}
                        onChange={(e) => handleChange('language', e.target.value)}
                        className="w-full h-11 pl-10 pr-10 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)] transition-all appearance-none cursor-pointer"
                      >
                        <option value="">(Auto)</option>
                        <option value="sq">Albanian (Shqip)</option>
                        <option value="ar">Arabic (عربي)</option>
                        <option value="az">Azerbaijani (Azeri)</option>
                        <option value="eu">Basque (Euskara)</option>
                        <option value="bs">Bosnian (Bosanski)</option>
                        <option value="bg">Bulgarian (Български)</option>
                        <option value="ca">Catalan (Català)</option>
                        <option value="hr">Croatian (Hrvatski)</option>
                        <option value="cs">Czech (Čeština)</option>
                        <option value="da">Danish (Dansk)</option>
                        <option value="nl">Dutch (Nederlands)</option>
                        <option value="en">English</option>
                        <option value="en-GB">English (British)</option>
                        <option value="et">Estonian (Eesti)</option>
                        <option value="fi">Finnish (Suomi)</option>
                        <option value="fr">French (Français)</option>
                        <option value="gl">Galician (Galego)</option>
                        <option value="de">German (Deutsch)</option>
                        <option value="el">Greek (Ελληνικά)</option>
                        <option value="he">Hebrew (עברית)</option>
                        <option value="hu">Hungarian (Magyar)</option>
                        <option value="id">Indonesian (Bahasa Indonesia)</option>
                        <option value="it">Italian (Italiano)</option>
                        <option value="ja">Japanese (日本語)</option>
                        <option value="ko">Korean (한국어)</option>
                        <option value="lv">Latvian (Latviešu)</option>
                        <option value="lt">Lithuanian (lietuvių)</option>
                        <option value="mk">Macedonian (Македонски)</option>
                        <option value="mn">Mongolian (Монгол)</option>
                        <option value="no">Norwegian (Norsk bokmål)</option>
                        <option value="fa">Persian (پارسی)</option>
                        <option value="pl">Polish (Polski)</option>
                        <option value="pt">Portuguese (Português)</option>
                        <option value="pt-BR">Portuguese/Brasil (Português/Brasil)</option>
                        <option value="ro">Romanian (Română)</option>
                        <option value="ru">Russian (Русский)</option>
                        <option value="sr-YU">Serbian (Srpski)</option>
                        <option value="sr">Serbian Cyrillic (Српски)</option>
                        <option value="zh">Simplified Chinese (简体中文)</option>
                        <option value="sk">Slovak (Slovenčina)</option>
                        <option value="sl">Slovene (Slovenščina)</option>
                        <option value="es">Spanish (Español)</option>
                        <option value="es-PA">Spanish/Panama (Español/Panamá)</option>
                        <option value="sv">Swedish (Svenska)</option>
                        <option value="ta-IN">Tamil (தமிழ்)</option>
                        <option value="th">Thai (ไทย)</option>
                        <option value="zh-TW">Traditional Chinese (繁體中文)</option>
                        <option value="tr">Turkish (Türkçe)</option>
                        <option value="uk">Ukrainian (Українська)</option>
                        <option value="vi">Vietnamese (Tiếng Việt)</option>
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--theme-textSecondary)]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[var(--theme-text)]">
                    GitLab access token
                  </label>
                  <div className="relative">
                    <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-textSecondary)]" />
                    <input
                      type="text"
                      value={formState.gitlab_token}
                      onChange={(e) => handleChange('gitlab_token', e.target.value)}
                      className="w-full h-11 pl-10 pr-4 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] placeholder:text-[var(--theme-textSecondary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)] transition-all font-mono text-sm"
                      placeholder="Enter your GitLab token"
                    />
                  </div>
                  <p className="text-xs text-[var(--theme-textSecondary)] mt-1">
                    Use this token to integrate automated workflows and sync tasks from GitLab.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Preferences Section */}
          <div 
            className="rounded-xl border border-[var(--theme-border)] shadow-sm overflow-hidden theme-transition"
            style={{ backgroundColor: 'var(--theme-cardBg)' }}
          >
            <div 
              className="px-6 py-4 text-white font-semibold text-sm"
              style={{ 
                background: 'linear-gradient(135deg, #14b8a6, #0d9488)'
              }}
            >
              Preferences
            </div>
            
            {!isLoading && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--theme-text)]">
                      Time zone
                    </label>
                    <div className="relative">
                      <Clock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-textSecondary)] pointer-events-none z-10" />
                      <select
                        value={formState.time_zone}
                        onChange={(e) => handleChange('time_zone', e.target.value)}
                        className="w-full h-11 pl-10 pr-10 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)] transition-all appearance-none cursor-pointer"
                      >
                        {timeZones.map(tz => (
                          <option key={tz.value} value={tz.value}>{tz.label}</option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--theme-textSecondary)]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--theme-text)]">
                      Display comments
                    </label>
                    <div className="relative">
                      <MessageSquare size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-textSecondary)] pointer-events-none z-10" />
                      <select
                        value={formState.comments_sorting}
                        onChange={(e) => handleChange('comments_sorting', e.target.value)}
                        className="w-full h-11 pl-10 pr-10 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)] transition-all appearance-none cursor-pointer"
                      >
                        <option value="asc">In chronological order</option>
                        <option value="desc">In reverse chronological order</option>
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--theme-textSecondary)]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {!isLoading && (
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="px-5 h-10 rounded-lg border border-[var(--theme-border)] text-sm font-medium text-[var(--theme-textSecondary)] hover:bg-[var(--theme-surface)] hover:border-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 h-10 rounded-lg text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-accent))' }}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
