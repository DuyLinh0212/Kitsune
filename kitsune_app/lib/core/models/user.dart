// kitsune_app/lib/core/models/user.dart

class UserProfile {
  final int id;
  final String username;
  final String email;
  final String? fullName;
  final String? avatarUrl;
  final bool isVerified;
  final List<String> roles;
  final String? createdAt;

  const UserProfile({
    required this.id,
    required this.username,
    required this.email,
    this.fullName,
    this.avatarUrl,
    this.isVerified = false,
    this.roles = const [],
    this.createdAt,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    // Parse User_Role(Role(RoleName))
    final userRoles = json['User_Role'] as List<dynamic>?;
    final roles = <String>[];
    if (userRoles != null) {
      for (final r in userRoles) {
        final role = (r as Map<String, dynamic>)['Role'] as Map<String, dynamic>?;
        if (role != null) {
          roles.add((role['RoleName'] as String).toUpperCase());
        }
      }
    }

    return UserProfile(
      id: (json['Id'] ?? json['id']) as int,
      username: (json['Username'] ?? json['username']) as String,
      email: (json['Email'] ?? json['email']) as String,
      fullName: (json['FullName'] ?? json['fullName']) as String?,
      avatarUrl: (json['AvatarUrl'] ?? json['avatarUrl']) as String?,
      isVerified: (json['IsVerified'] ?? json['isVerified'] ?? false) as bool,
      roles: roles,
      createdAt: (json['CreatedAt'] ?? json['createdAt']) as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'Id': id,
        'Username': username,
        'Email': email,
        'FullName': fullName,
        'AvatarUrl': avatarUrl,
        'IsVerified': isVerified,
      };

  String get displayName => fullName ?? username;
}

class LoginRequest {
  final String login;
  final String password;

  const LoginRequest({required this.login, required this.password});
}

class RegisterRequest {
  final String username;
  final String email;
  final String password;
  final String? fullName;

  const RegisterRequest({
    required this.username,
    required this.email,
    required this.password,
    this.fullName,
  });
}
