import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentUser, fetchOperators, apiRequest } from './api';

/**
 * Custom hook to fetch and manage user data
 * @returns {Object} The user data state and related functions
 */
export const useUser = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCurrentUser();
      setUserData(data);
      return data;
    } catch (err) {
      setError(err.message);
      if (err.message === 'Authentication expired' || err.message === 'No authentication token found') {
        navigate('/login');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const isAdmin = userData?.team_role?.includes('ADMIN');

  return { userData, loading, error, refetch: fetchUser, isAdmin };
};

/**
 * Custom hook to fetch and manage operators data
 * @param {boolean} activeOnly Whether to return only active operators
 * @returns {Object} The operators data state and related functions
 */
export const useOperators = (activeOnly = false) => {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchOperatorsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOperators(activeOnly);
      setOperators(data);
      return data;
    } catch (err) {
      setError(err.message);
      if (err.message === 'Authentication expired' || err.message === 'No authentication token found') {
        navigate('/login');
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, [navigate, activeOnly]);

  useEffect(() => {
    fetchOperatorsData();
  }, [fetchOperatorsData]);

  return { operators, loading, error, refetch: fetchOperatorsData };
};

/**
 * Custom hook to fetch and manage data from any API endpoint
 * @param {string} endpoint The API endpoint to fetch from
 * @param {Object} options Additional fetch options
 * @param {boolean} fetchOnMount Whether to fetch data when the component mounts
 * @returns {Object} The data state and related functions
 */
export const useApiData = (endpoint, options = {}, fetchOnMount = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(fetchOnMount);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest(endpoint, options);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      if (err.message === 'Authentication expired' || err.message === 'No authentication token found') {
        navigate('/login');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [endpoint, navigate, options]);

  useEffect(() => {
    if (fetchOnMount) {
      fetchData();
    }
  }, [fetchData, fetchOnMount]);

  return { data, loading, error, refetch: fetchData, setData };
};

/**
 * Custom hook to manage form state
 * @param {Object} initialValues The initial form values
 * @returns {Object} The form state and related functions
 */
export const useForm = (initialValues = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setValues(prev => ({ ...prev, [name]: value }));
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const handleDirectChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const handleBlur = useCallback((event) => {
    const { name } = event.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleDirectChange,
    setValues,
    setErrors,
    resetForm,
  };
};

const hooks = {
  useUser,
  useOperators,
  useApiData,
  useForm,
};

export default hooks; 